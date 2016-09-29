girder.exposePluginConfig('owncloud', 'plugins/owncloud/config');

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
    girder.restRequest({
       path: 'user/ocpass'
    }).done(_.bind(function (resp) {
       var f = document.createElement('form');
       f.setAttribute('id', 'login');
       f.setAttribute('name', 'login');
       f.setAttribute('method', 'post');
       f.setAttribute('target', 'iframe');
       f.setAttribute('action', 'https://owncloud.hub.yt/index.php');

       var i = document.createElement("input");
       i.setAttribute('type', 'hidden');
       i.setAttribute('name', 'user');
       i.setAttribute('value', resp['username']);

       var s = document.createElement("input");
       s.setAttribute('type', 'hidden');
       s.setAttribute('name', 'password');
       s.setAttribute('value', resp['password']);

       f.appendChild(i);
       f.appendChild(s);
       f.submit();
       console.log("Executed!");
   }, this));
   }
};

girder.wrap(girder.views.HierarchyWidget, 'render', function (render) {
    render.call(this);

    if (this.parentModel.get('_modelType') === 'user') {
        $('.g-user-hierarchy-container').append(girder.templates.owncloud_frame());
        upon(function() { return document.getElementById('iframe') !== null;}, function() {
            _addOwnCloudFrame();
        });
    }

    return this;
});

