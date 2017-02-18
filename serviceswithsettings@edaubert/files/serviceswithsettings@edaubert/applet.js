const Applet = imports.ui.applet;
const PopupMenu = imports.ui.popupMenu;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const GLib = imports.gi.GLib;
const Util = imports.misc.util;
const Settings = imports.ui.settings;

const UUID = 'serviceswithsettings@edaubert';
// const AppletDir = imports.ui.appletManager.appletMeta[UUID].path;

var regexService = / \[(?: |\t)(\+|-)(?: |\t)\](?: |\t)+([a-zA-Z0-9-_]+)/;

// TODO scroll when the list of services is too high
// TODO add a button to switch them all together

// Logging
// ----------
function log(message) {
    global.log(UUID + '#' + log.caller.name + ': ' + message);
}

function logError(error) {
    global.logError(UUID + '#' + logError.caller.name + ': ' + error);
}

/**
 * Use this method as I need a way to get a callback called on process failure.
 * This code comes from https://github.com/linuxmint/Cinnamon/pull/6294/files
 */
function spawnCommandLineAsync(command_line, callback, errback) {
    let [, argv] = GLib.shell_parse_argv(command_line);

    let [, pid] = GLib.spawn_async_with_pipes(null,
        argv,
        null,
        GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD, /* eslint no-bitwise: 0 */
        null );
    var _childWatch = GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, function (pid, status) {
        GLib.source_remove(_childWatch);
        GLib.spawn_close_pid(pid);

        if (status !== 0) {
            if (typeof errback === 'function') {
                errback();
            }
        } else {
            if (typeof callback === 'function') {
                callback();
            }
        }
    });
}

// Applet
// ----------
function MyApplet(metadata, orientation, panel_height, instanceId) {
    this._init(metadata, orientation, panel_height, instanceId);
}

MyApplet.prototype = {
    __proto__: Applet.IconApplet.prototype,

    _init: function (metadata, orientation, panel_height, instanceId) {
        Applet.IconApplet.prototype._init.call(this, orientation);
        this.orientation = orientation;

        this.settings = new Settings.AppletSettings(this, 'serviceswithsettings@edaubert', instanceId);
        this.menuManager = new PopupMenu.PopupMenuManager(this);
        this.menu = new Applet.AppletPopupMenu(this, this.orientation);
        // this.subMenu = new PopupMenu.PopupSubMenu(this, "toto");
        // this.menu.addMenuItem(this.subMenu);
        this.menuManager.addMenu(this.menu);
        this.menuItems = {};
        // this.servicesSection = new PopupMenu.PopupMenuSection();
        // this.menu.addChildMenu(this.servicesSection);

        try {
            this.set_applet_tooltip('Your services');
            this.set_applet_icon_symbolic_name('system-run');
        } catch (error) {
            logError(error);
        }
    },
    bindProperties: function () {
        this.refreshInterval = this.settings.getValue('refreshInterval');
        this.settings.bindProperty(
            Settings.BindingDirection.IN,
            'refreshInterval',
            'refreshInterval',
            this.refreshServices,
            null
        );
        this.whitelist = this.settings.getValue('whitelist');
        this.whitelistRegex = '(?:' + this.whitelist.replace(/,/g, '|') + ')$';
        this.settings.bindProperty(
            Settings.BindingDirection.IN,
            'whitelist',
            'whitelist',
            function () {
                this.whitelistRegex = '(?:' + this.whitelist.replace(/,/g, '|') + ')$';
                this.reinitializeMenu();
            },
            null
        );
        this.blacklist = this.settings.getValue('blacklist');
        this.blacklistRegex = '(?:' + this.blacklist.replace(/,/g, '|') + ')$';
        this.settings.bindProperty(
            Settings.BindingDirection.IN,
            'blacklist',
            'blacklist',
            function () {
                this.blacklistRegex = '(?:' + this.blacklist.replace(/,/g, '|') + ')$';
                this.reinitializeMenu();
            },
            null
        );
        this.switchAll = this.settings.getValue('switchAll');
        this.settings.bindProperty(
            Settings.BindingDirection.IN,
            'switchAll',
            'switchAll',
            this.reinitializeMenu,
            null
        );
    },
    unbindProperties: function () {
        this.settings.unbindProperty('refreshInterval');
        this.settings.unbindProperty('whitelist');
        this.settings.unbindProperty('blacklist');
        this.settings.unbindProperty('switchAll');
    },
    reinitializeMenu: function () {
        this.menu.removeAll();
        this.menuItems = {};
        this.refreshServices();
        this.addSwitchAllButton();
    },
    addSwitchAllButton: function () {
        if (this.switchAll) {
            let separatorBox = new PopupMenu.PopupSeparatorMenuItem();
            let switchAllItem = new PopupMenu.PopupSwitchMenuItem('All Services', false);
            switchAllItem.connect('toggled',
                Lang.bind(this, function (item) {
                    var command = 'stop';
                    if (item.state) {
                        command = 'start';
                    }
                    this.closeMenuFunction();
                    // this.executeCommandOnService(serviceName, command);
                    // TODO toggle all services
                    log(Object.keys(this.menuItems));
                    Object.keys(this.menuItems).forEach(function (serviceName) {
                        log(Object.keys(this.menuItems[serviceName]));
                    });
                    logError('Toggle all services not yet implemented');
                })
            );
            this.menu.addMenuItem(switchAllItem);
            this.menu.addMenuItem(separatorBox);
        }
    },
    toggleSwitchAllButtonDisplay: function () {
        if (this.switchAll) {
            log('add switchAll');
            // this.switchAllSection.addMenuItem(this.switchAllItem);
            this.menu.addMenuItem(this.switchAllItem);
        } else {
            log('Remove switchAll');
            // this.switchAllSection.removeChildMenu(this.switchAllItem);
            this.menu.removeChildMenu(this.switchAllItem);
        }
    },
    closeMenuFunction: function () {
        this.menu.close();
    },
    readServices: function (callback) {
        Util.spawn_async(
            ['/usr/sbin/service', '--status-all'],
            Lang.bind(this, callback)
        );
    },
    executeCommandOnService: function (service, command) {
        // Util.spawn_async(
        //     ["gksudo", "--message", "You need to get root rights to " + command + " " + service, "service", service, command],
        //     Lang.bind(this, this.refreshServices)
        // );
        spawnCommandLineAsync(
            "gksudo --message 'You need to get root rights to " + command + ' ' + service + "' service " + service + ' ' + command,
            Lang.bind(this, function () {this.refreshServices(service);}),
            Lang.bind(this, function () {this.refreshServices(service);})
        );
    },
    extractNameAndState: function (serviceDescription) {
        var serviceName;
        var serviceState;
        if (serviceDescription.match(regexService) !== null) {
            serviceState = serviceDescription.replace(regexService, '$1') === '+';
            serviceName = serviceDescription.replace(regexService, '$2');
        }
        return [serviceName, serviceState];
    },
    serviceShoudBeDisplayed: function (serviceName) {
        return serviceName &&
            (this.whitelist === '' || serviceName.match(this.whitelistRegex) !== null) &&
            (this.blacklist === '' || serviceName.match(this.blacklistRegex) === null);
    },
    getOrCreateServiceItem: function (serviceName, serviceState, serviceShoudBeDisplayed) {
        var service = this.menuItems[serviceName];
        if (serviceShoudBeDisplayed && !service) {
            let serviceSwitch = new PopupMenu.PopupSwitchMenuItem(serviceName, serviceState);
            serviceSwitch.connect('toggled', Lang.bind(this,
                function (item) {
                    var command = 'stop';
                    if (item.state) {
                        command = 'start';
                    }
                    this.closeMenuFunction();
                    this.executeCommandOnService(serviceName, command);
                })
            );
            service = {
                item: serviceSwitch,
                displayed: false
            };
            this.menuItems[serviceName] = service;
        }
        return service;
    },
    refreshService: function (serviceDescription, serviceName) {
        if (!serviceName || serviceDescription.indexOf(serviceName) !== -1) {
            let [serviceName, serviceState] = this.extractNameAndState(serviceDescription);
            var serviceShoudBeDisplayed = this.serviceShoudBeDisplayed(serviceName);
            var service = this.getOrCreateServiceItem(serviceName, serviceState, serviceShoudBeDisplayed);
            if (service) {
                log(serviceName + ' ' + service.displayed + ' ' + serviceShoudBeDisplayed);
                if (service.displayed) {
                    service.item.setToggleState(serviceState);
                    if (serviceState) {
                        this.switchAllItem.setToggleState(true);
                    }
                } else if (serviceShoudBeDisplayed) {
                    service.displayed = true;
                    // this.servicesSection.addMenuItem(service.item);
                    this.menu.addMenuItem(service.item);
                }
            }
        }
    },
    updateServices: function (serviceName = undefined) {
        this.readServices(
            function (output) {
                output.split('\n').forEach(Lang.bind(this, function (serviceDescription) {
                    this.refreshService(serviceDescription, serviceName);
                }));
            }
        );
    },
    refreshServices: function (serviceName = undefined) {
        this.updateServices(serviceName);
        if (!serviceName) {
            if (this.myFunctionId > 0) {
                Mainloop.source_remove(this.myFunctionId);
                this.myFunctionId = 0;
            }
            this.myFunctionId = Mainloop.timeout_add_seconds(this.refreshInterval,
                Lang.bind(this, this.refreshServices)
            );
        }
    },
    on_applet_clicked: function () {
        this.menu.toggle();
    },
    on_applet_added_to_panel: function () {
        this.myFunctionId = 0;
        this.bindProperties();
        this.reinitializeMenu();
    },
    on_applet_removed_from_panel: function () {
        this.unbindProperties();
        if (this.myFunctionId > 0) {
            Mainloop.source_remove(this.myFunctionId);
            this.myFunctionId = 0;
        }
    }
};

/* eslint no-unused-vars: 0*/
function main(metadata, orientation, panel_height, instanceId) {
    let myapplet = new MyApplet(metadata, orientation, panel_height, instanceId);
    return myapplet;
}
