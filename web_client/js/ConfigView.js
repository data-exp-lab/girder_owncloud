/**
* Administrative configuration view.
*/
girder.views.owncloud_ConfigView = girder.View.extend({
    events: {
        'submit #g-owncloud-settings-form': function (event) {
            event.preventDefault();

            this.$('#g-owncloud-error-message').empty();

            this._saveSettings([{
                key: 'owncloud.url',
                value: this.$('#g-owncloud-url').val().trim()
            }]);
        }
    },

    initialize: function () {
        girder.restRequest({
            type: 'GET',
            path: 'system/setting',
            data: {
                list: JSON.stringify(['owncloud.url'])
            }
        }).done(_.bind(function (resp) {
            this.render();
            this.$('#g-owncloud-url').val(resp['owncloud.url']);
        }, this));
    },

    render: function () {
        this.$el.html(girder.templates.owncloud_config());

        if (!this.breadcrumb) {
            this.breadcrumb = new girder.views.PluginConfigBreadcrumbWidget({
                pluginName: 'OwnCloud',
                el: this.$('.g-config-breadcrumb-container'),
                parentView: this
            }).render();
        }
        return this;
    },

    _saveSettings: function (settings) {
        girder.restRequest({
            type: 'PUT',
            path: 'system/setting',
            data: {
                list: JSON.stringify(settings)
            },
            error: null
        }).done(_.bind(function () {
            girder.events.trigger('g:alert', {
                icon: 'ok',
                text: 'Settings saved.',
                type: 'success',
                timeout: 3000
            });
        }, this)).error(_.bind(function (resp) {
            this.$('#g-owncloud-error-message').text(
                resp.responseJSON.message
            );
        }, this));
    }
});

girder.router.route('plugins/owncloud/config', 'owncloudConfig', function () {
    girder.events.trigger('g:navigateTo', girder.views.owncloud_ConfigView);
});
