import _ from 'underscore';

import PluginConfigBreadcrumbWidget from 'girder/views/widgets/PluginConfigBreadcrumbWidget';
import View from 'girder/views/View';
import events from 'girder/events';
import { restRequest } from 'girder/rest';

import ConfigViewTemplate from '../templates/configView.pug';
import '../stylesheets/configView.styl';

/**
* Administrative configuration view.
*/
var ConfigView = View.extend({
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
        restRequest({
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
        this.$el.html(ConfigViewTemplate());

        if (!this.breadcrumb) {
            this.breadcrumb = new PluginConfigBreadcrumbWidget({
                pluginName: 'OwnCloud',
                el: this.$('.g-config-breadcrumb-container'),
                parentView: this
            }).render();
        }
        return this;
    },

    _saveSettings: function (settings) {
        restRequest({
            type: 'PUT',
            path: 'system/setting',
            data: {
                list: JSON.stringify(settings)
            },
            error: null
        }).done(_.bind(function () {
            events.trigger('g:alert', {
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

export default ConfigView;
