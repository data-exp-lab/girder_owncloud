#!/usr/bin/env python
# -*- coding: utf-8 -*-

import base64
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.fernet import Fernet
import json
import os
import random
import requests
import six
import string

from girder import events
from girder.api import access
from girder.api.describe import Description, describeRoute
from girder.api.rest import loadmodel, getCurrentToken
from girder.models.model_base import AccessType, ValidationException
# from girder.plugins.ythub.constants import \
#    PluginSettings as ythubPluginSettings
from girder.utility import setting_utilities
from girder.utility.model_importer import ModelImporter
from .constants import PluginSettings


def validateString(value):
    """
    Make sure a value is a unicode string.

    :param value: the value to coerce into a unicode string if it isn't
        already.
    :returns: the unicode string version of the value.
    """
    if value is None:
        value = six.u('')
    if not isinstance(value, six.text_type):
        value = six.text_type(value)
    return value


@setting_utilities.validator(PluginSettings.OWNCLOUD_URL)
def validateTmpNbUrl(doc):
    if not doc['value']:
        raise ValidationException(
            'OwnCloud url must not be empty.', 'value')


@access.user
@loadmodel(model='user', level=AccessType.WRITE)
@describeRoute(
    Description('Update OwnCloud credentials.')
    .param('id', 'The ID of the user', paramType='path')
    .param('password', 'New OwnCloud password',
           required=False)
)
def updateOwnCloudPassword(user, params):
    if not user.get('ocpass'):
        user = ModelImporter.model('user').save(user)
    password = params.get('password', user['ocpass'])

    message = json.dumps(
        {'user': user['login'], 'pass': password}
    ).encode('utf8')

    settings = ModelImporter.model('setting')
    oc_url = settings.get(PluginSettings.OWNCLOUD_URL)
    r = requests.get(oc_url + '/user')
    data = r.json()
    owncloud_pubkey = serialization.load_pem_public_key(
        data['pubkey'].encode('utf8'),
        backend=default_backend()
    )

    private_key = serialization.load_pem_private_key(
        settings.get('ythub.priv_key').encode('utf8'),
        password=None,
        backend=default_backend()
    )
    signer = private_key.signer(
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.MAX_LENGTH
        ),
        hashes.SHA256()
    )
    signer.update(message)
    signature = signer.finalize()

    ciphertext = owncloud_pubkey.encrypt(
        message,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA1()),
            algorithm=hashes.SHA1(),
            label=None
        )
    )

    payload = {'message': base64.b64encode(ciphertext).decode('utf8'),
               'signature': base64.b64encode(signature).decode('utf8')}
    r = requests.post(oc_url + '/user', data=json.dumps(payload))
    return


@access.user
@loadmodel(model='user', level=AccessType.WRITE)
@describeRoute(
    Description('Get OwnCloud credentials.')
    .param('id', 'The ID of the user', paramType='path')
)
def getOwnCloudPassword(user, params):
    if not user.get('ocpass'):
        user = ModelImporter.model('user').save(user)

    credentials = json.dumps(
        {'user': user['login'], 'pass': user['ocpass']}
    ).encode('utf8')

    token = getCurrentToken()
    key = token['_id'][:32]
    credentials = Fernet(base64.b64encode(key)).encrypt(credentials)
    return {'credentials': credentials.decode('utf8')}


def _userUpdate(event):
    user = event.info
    length = 20
    chars = string.ascii_letters + string.digits + '!@#$%^&*()'
    random.seed = (os.urandom(1024))
    new_pass = ''.join(random.choice(chars) for i in range(length))
    user['ocpass'] = validateString(user.get('ocpass', new_pass))


def load(info):
    info['apiRoot'].user.route(
        'PUT', (':id', 'ocpass'), updateOwnCloudPassword)
    info['apiRoot'].user.route(
        'GET', (':id', 'ocpass'), getOwnCloudPassword)
    events.bind('model.user.save', 'owncloud', _userUpdate)
    # ModelImporter.model('user').exposeFields(
    #    level=AccessType.WRITE, fields='ocpass')
