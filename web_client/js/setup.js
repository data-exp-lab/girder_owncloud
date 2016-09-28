girder.exposePluginConfig('owncloud', 'plugins/owncloud/config');

function _addOwnCloudFrame() {
    $('.g-user-hierarchy-container').append(girder.templates.owncloud_frame());

    girder.restRequest({
       path: 'user/ocpass'
    }).done(_.bind(function (resp) {
       var f = document.createElement("form");
       f.setAttribute('id', 'ocform');
       f.setAttribute('method', 'post');
       f.setAttribute('target', 'iframe');
       f.setAttribute('action', 'https://owncloud.hub.yt/');

       var i = document.createElement("input");
       i.setAttribute('type', 'hidden');
       i.setAttribute('name', 'username');
       i.setAttribute('value', resp['username']);

       var s = document.createElement("input");
       i.setAttribute('type', 'hidden');
       i.setAttribute('name', 'password');
       i.setAttribute('value', resp['password']);

       f.appendChild(i);
       f.appendChild(s);

       if (document.getElementById('ocform') !== null) {
           document.getElementById('ocform').submit();
       }
   }, this));
}

girder.wrap(girder.views.HierarchyWidget, 'render', function (render) {
    render.call(this);

    if (this.parentModel.get('_modelType') === 'user') {
        _addOwnCloudFrame();
    }

    return this;
});

