;
(function (init) {
    "use strict";
    var ret = init();
    define('aui/css-deprecation-warnings',['aui/internal/deprecation'], function () {
        return ret;
    });
})(function () {
    'use strict';

    var css = AJS.deprecate.css;

    css('.aui-dropdown2-trigger.aui-style-dropdown2triggerlegacy1', {
        displayName: 'Dropdown2 legacy trigger'
    });
    css('.aui-message span.aui-icon', {
        displayName: 'Message icon span'
    });
    css('.aui-zebra', {
        displayName: 'Zebra table rows'
    });
    css('.aui-nav-pagination > li.aui-nav-current', {
        alternativeName: 'aui-nav-selected'
    });
    css('.aui-tabs.vertical-tabs', {
        displayName: 'Vertical tabs'
    });
    css('form.aui span.content');
    css([
        'form.aui .button',
        'form.aui .buttons-container'
    ], {
        displayName: 'Unprefixed buttons',
        alternativeName: 'aui-button and aui-buttons'
    });
    css([
        'form.aui .icon-date',
        'form.aui .icon-range',
        'form.aui .icon-help',
        'form.aui .icon-required',
        'form.aui .icon-inline-help',
        'form.aui .icon-users',
        '.aui-icon-date',
        '.aui-icon-range',
        '.aui-icon-help',
        '.aui-icon-required',
        '.aui-icon-users',
        '.aui-icon-inline-help'
    ], {
        displayName: 'Form icons'
    });
    css([
        '.aui-icon.icon-move-d',
        '.aui-icon.icon-move',
        '.aui-icon.icon-dropdown-d',
        '.aui-icon.icon-dropdown',
        '.aui-icon.icon-dropdown-active-d',
        '.aui-icon.icon-dropdown-active',
        '.aui-icon.icon-minimize-d',
        '.aui-icon.icon-minimize',
        '.aui-icon.icon-maximize-d',
        '.aui-icon.icon-maximize'
    ], {
        displayName: 'Core icons'
    });
    css([
        '.aui-message.error',
        '.aui-message.warning',
        '.aui-message.hint',
        '.aui-message.info',
        '.aui-message.success'
    ], {
        displayName: 'Unprefixed message types AUI-2150'
    });
    css([
        '.aui-dropdown2 .active',
        '.aui-dropdown2 .checked',
        '.aui-dropdown2 .disabled',
        '.aui-dropdown2 .interactive'
    ], {
        displayName: 'Unprefixed dropdown2 css AUI-2150'
    });

    css([
        'aui-page-header-marketing',
        'aui-page-header-hero'
    ], {
        displayName: 'Marketing style headings'
    });
});
