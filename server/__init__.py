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

from girder.api import access
from girder.api.describe import Description, describeRoute
from girder.api.rest import \
    loadmodel, getCurrentToken, boundHandler, filtermodel
from girder.models.model_base import AccessType, ValidationException
from girder.plugins.ythub.constants import \
    PluginSettings as ythubPluginSettings
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
        user = _generateOCPass(user)
    password = params.get('password', user['ocpass'])
    if password != user['ocpass']:
        _updateOCPasswd({'user': user['login'], 'pass': password})
        user['ocpass'] = password
        user = ModelImporter.model('user').save(user)
    return user


@access.user
@describeRoute(
    Description('Retrieve OC credentials of the currently logged-in user.')
)
@boundHandler()
def getOwnCloudPassword(self, params):
    user = self.getCurrentUser()
    if not user.get('ocpass'):
        user = _generateOCPass(user)
        _updateOCPasswd({'user': user['login'], 'pass': user['ocpass']})
        user = self.model('user').save(user)

    credentials = json.dumps(
        {'username': user['login'], 'password': user['ocpass']}
    ).encode('utf8')

    token = getCurrentToken()
    key = token['_id'][:32]
    credentials = Fernet(base64.b64encode(key)).encrypt(credentials)
    return {'credentials': credentials.decode('utf8')}


def _updateOCPasswd(credentials):
    message = json.dumps(credentials).encode('utf8')
    settings = ModelImporter.model('setting')
    oc_url = settings.get(PluginSettings.OWNCLOUD_URL)
    r = requests.get(oc_url + '/user')
    data = r.json()
    owncloud_pubkey = serialization.load_pem_public_key(
        data['pubkey'].encode('utf8'),
        backend=default_backend()
    )

    private_key = serialization.load_pem_private_key(
        settings.get(ythubPluginSettings.HUB_PRIV_KEY).encode('utf8'),
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


def _generateOCPass(user):
    length = 20
    chars = string.ascii_letters + string.digits + '!@#$%^&*()'
    random.seed = (os.urandom(1024))
    user['ocpass'] = ''.join(random.choice(chars) for i in range(length))
    return ModelImporter.model('user').save(user)


def load(info):
    info['apiRoot'].user.route(
        'PUT', (':id', 'ocpass'), updateOwnCloudPassword)
    info['apiRoot'].user.route(
        'GET', ('ocpass',), getOwnCloudPassword)
