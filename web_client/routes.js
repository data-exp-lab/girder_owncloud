import router from 'girder/router';
import events from 'girder/events';
import { exposePluginConfig } from 'girder/utilities/PluginUtils';

exposePluginConfig('owncloud', 'plugins/owncloud/config');

import ConfigView from './views/ConfigView';

router.route('plugins/owncloud/config', 'owncloudConfig', function () {
    events.trigger('g:navigateTo', ConfigView);
});
