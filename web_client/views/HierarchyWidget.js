import _ from 'underscore';
import fernet from 'fernet';

import HierarchyWidget from 'girder/views/widgets/HierarchyWidget';
import { restRequest } from 'girder/rest';
import { wrap } from 'girder/utilities/PluginUtils';
import { getCurrentUser, getCurrentToken } from 'girder/auth';
import owncloudHierarchyWidget from '../templates/owncloudHierarchyWidget.pug';

function upon (test, fn) {
    if (typeof(test) == 'function' && test()) {
        fn();
    } else if (typeof(test) == 'string' && window[test]) {
        fn();
    } else {
        setTimeout(function() { upon(test, fn); }, 50);
    }
}; // upon()

function _addOwnCloudFrame() {
    if (document.getElementById('iframe') !== null) {
       restRequest({
          path: 'user/ocpass'
       }).done(_.bind(function (resp) {
          var token = getCurrentToken().substring(0, 32);
          var secret = new fernet.Secret(btoa(token));

          var fernetToken = new fernet.Token({
              secret: secret,
              token: resp['credentials'],
              ttl: 0
          })
          var credentials = JSON.parse(fernetToken.decode());
          var f = document.createElement('form');
          f.setAttribute('id', 'login');
          f.setAttribute('name', 'login');
          f.setAttribute('method', 'post');
          f.setAttribute('target', 'iframe');
          f.setAttribute('action', 'https://owncloud.hub.yt/index.php');

          var i = document.createElement("input");
          i.setAttribute('type', 'hidden');
          i.setAttribute('name', 'user');
          i.setAttribute('value', credentials['username']);

          var s = document.createElement("input");
          s.setAttribute('type', 'hidden');
          s.setAttribute('name', 'password');
          s.setAttribute('value', credentials['password']);

          f.appendChild(i);
          f.appendChild(s);
          f.submit();
      }, this));
   }
};

wrap(HierarchyWidget, 'render', function (render) {
    render.call(this);

    if (this.parentModel.get('_modelType') === 'user') {
        $('.g-user-hierarchy-container').append(owncloudHierarchyWidget());
        upon(function() { return document.getElementById('iframe') !== null;}, function() {
            _addOwnCloudFrame();
        });
    }

    return this;
});
