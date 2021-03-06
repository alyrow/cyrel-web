class Api {
    rpc

    /**
     * Create the api to interact with the backend
     * @type {(url: string, fatalError: function) => Api}
     * @param url Url of the backend
     * @param fatalError Function to be called on fatal error
     */
    constructor(url, fatalError) {
        this.rpc = simple_jsonrpc.connect_xhr(url, {
            onerror: fatalError
        });
    }

    static _backend = null;

    /**
     * Return an instance of the api
     * @type {() => Api}
     */
    static get backend() {
        if (Api._backend === null) this.backend = new Api("__BACKEND_URL__", e => {
            $('body')
                .toast({
                    class: 'error',
                    message: e
                })
            ;
        });
        return Api._backend;
    }

    static set backend(no) {
        if (Api._backend !== null) console.error("Unexpected action blocked");
        else Api._backend = no;
    }

    static checkIfLoggedAndAct(api) {
        const needLogin = document.querySelector('meta[name="logged"]').content === "1";
        if (!needLogin) return;
        const act = () => {
            document.location.href = "/login.html";
        };

        if (!window.localStorage.getItem("__")) {
            act();
            return;
        }
        api.isLogged(bool => {
            if (!bool) {
                window.localStorage.removeItem("__");
                act();
            }
        }, err => {
            console.error(err);
            Config.loadConfig("errors", errors => {
                if (err.code === errors.ExpiredSignature.code) {
                    window.localStorage.removeItem("__");
                    act();
                }
            });
        })
    }

    static checkIfGroupAndAct(api) {
        const needGroup = document.querySelector('meta[name="group"]').content === "1";
        if (!needGroup) return;
        api.getMyGroups(groups => {
            if (groups.length === 0) {
                document.location.href = "/groups.html";
            }
        }, err => console.error(err))
    }

    /**
     * Function which logins a user
     * @type {(email: string, password: string, onSuccess: function, onFailure: function) => void}
     * @param email Username
     * @param password Password
     * @param onSuccess When the server validates the login infos
     * @param onFailure When the server rejects login infos
     */
    login(email, password, onSuccess, onFailure) {
        this.rpc.call("login", {email: email, password: password})
            .then(res => {
                window.localStorage.setItem("__", res); //FIXME Big vulnerability
                onSuccess();
            })
            .catch(err => onFailure(err));
    }

    /**
     * Function which asks the server if the user is eligible to registration
     * @type {(ldap: number, department: string, email: string, onSuccess: function, onFailure: function) => void}
     * @param ldap Ldap id
     * @param department Department id
     * @param email User email without 'at' and domain part
     * @param onSuccess When the server validates the user
     * @param onFailure When the server rejects the user
     */
    register_1(ldap, department, email, onSuccess, onFailure) {
        this.rpc.call("register_1", {ldap: ldap, department: department, email: email})
            .then(res => onSuccess(res))
            .catch(err => onFailure(err));
    }

    /**
     * Function which checks if user is human
     * @type {(hash: string, onSuccess: function, onFailure: function) => void}
     * @param hash Verification code
     * @param onSuccess Call a function with user identity
     * @param onFailure Check fail
     */
    register_2(hash, onSuccess, onFailure) {
        this.rpc.call("register_2", {hash: hash})
            .then(res => onSuccess(res))
            .catch(err => onFailure(err));
    }

    /**
     * Function which registers the user
     * @type {(hash: string, firstname: string, lastname: string, password: string, onSuccess: function, onFailure: function) => void}
     * @param hash Verification code
     * @param firstname Firstname
     * @param lastname Lastname
     * @param password Password
     * @param onSuccess User registered
     * @param onFailure Failed to register user
     */
    register_3(hash, firstname, lastname, password, onSuccess, onFailure) {
        this.rpc.call("register_3", {hash: hash, firstname: firstname, lastname: lastname, password: password})
            .then(res => onSuccess(res))
            .catch(err => onFailure(err));
    }

    /**
     * Function which ask the backend if the user is logged
     * @type {(onSuccess: function, onFailure: function) => void}
     * @param onSuccess When the user state is retrieved
     * @param onFailure When an error occur
     */
    isLogged(onSuccess, onFailure) {
        this.rpc.call("is_logged", {}, window.localStorage.getItem("__"))
            .then(res => onSuccess(res))
            .catch(err => {
                onFailure(err);
            });
    }

    /**
     * Function which retrieve a schedule
     * @type {(start: string, end: string, group: number, onSuccess: function, onFailure: function) => void}
     * @param start Start date of the schedule
     * @param end End date of the schedule
     * @param group Return the schedule associated with the user's group
     * @param onSuccess When the schedule is retrieved
     * @param onFailure When an error occur
     */
    getSchedule(start, end, group, onSuccess, onFailure) {
        this.rpc.call("schedule_get", {start: start, end: end, group: group}, window.localStorage.getItem("__"))
            .then(res => onSuccess(res))
            .catch(err => {
                onFailure(err);
                if (err.code === Config.getConfig("errors").IncorrectLoginInfo.code)
                    document.location.href = "/login.html";
            });
    }

    /**
     * Get all available groups
     * @type {(onSuccess: function, onFailure: function) => void}
     * @param onSuccess Give groups
     * @param onFailure When an error occur
     */
    getAllGroups(onSuccess, onFailure) {
        this.rpc.call("all_groups_get", {}, window.localStorage.getItem("__"))
            .then(res => onSuccess(res))
            .catch(err => {
                onFailure(err);
                if (err.code === Config.getConfig("errors").IncorrectLoginInfo.code)
                    document.location.href = "/login.html";
            });
    }

    /**
     * Get groups of the user
     * @type {(onSuccess: function, onFailure: function) => void}
     * @param onSuccess Give groups
     * @param onFailure When an error occur
     */
    getMyGroups(onSuccess, onFailure) {
        this.rpc.call("my_groups_get", {}, window.localStorage.getItem("__"))
            .then(res => onSuccess(res))
            .catch(err => {
                onFailure(err);
                if (err.code === Config.getConfig("errors").IncorrectLoginInfo.code)
                    document.location.href = "/login.html";
            });
    }

    /**
     * Join public groups
     * @type {(groups: number[], onSuccess: function, onFailure: function) => void}
     * @param groups Array of groups to join
     * @param onSuccess All groups joined successfully
     * @param onFailure When an error occur
     */
    joinGroups(groups, onSuccess, onFailure) {
        this.rpc.call("groups_join", {groups: groups}, window.localStorage.getItem("__"))
            .then(res => onSuccess(res))
            .catch(err => {
                onFailure(err);
                if (err.code === Config.getConfig("errors").IncorrectLoginInfo.code)
                    document.location.href = "/login.html";
            });
    }

    /**
     * Get server stored user config
     * @type {(onSuccess: function, onFailure: function) => void}
     * @param onSuccess Callback with the config
     * @param onFailure When an error occur
     */
    client_configs_get(onSuccess, onFailure) {
        this.rpc.call("client_configs_get", {client_id: __CLIENT_ID__}, window.localStorage.getItem("__"))
            .then(res => {
                try {
                    const j = JSON.parse(res);
                    onSuccess(j ? j : {});
                } catch (e) {
                    onSuccess({});
                }
            })
            .catch(err => {
                onFailure(err);
                console.error(err);
            });
    }

    /**
     * Set server stored user config
     * @type {(config: any, onSuccess: function, onFailure: function) => void}
     * @param config Config to store
     * @param onSuccess Success
     * @param onFailure When an error occur
     */
    client_configs_set(config, onSuccess, onFailure) {
        this.rpc.call("client_configs_set", {
            client_id: __CLIENT_ID__,
            config: JSON.stringify(config)
        }, window.localStorage.getItem("__"))
            .then(res => onSuccess(res))
            .catch(err => {
                onFailure(err);
                console.error(err);
            });
    }

    /**
     * Get server time
     * @type {(onSuccess: function, onFailure: function) => void}
     * @param onSuccess Callback with the time
     * @param onFailure When an error occur
     */
    time(onSuccess, onFailure) {
        this.rpc.call("time", {})
            .then(res => onSuccess(res))
            .catch(err => {
                onFailure(err);
                console.error(err);
            });
    }

    /**
     * Send password reset email
     * @type {(ldap: number, email: string, onSuccess: function, onFailure: function) => void}
     * @param ldap Ldap id
     * @param email User email
     * @param onSuccess Callback with the time
     * @param onFailure When an error occur
     */
    send_password_reset_code(ldap, email, onSuccess, onFailure) {
        this.rpc.call("send_password_reset_code", {ldap: ldap, email: email})
            .then(res => onSuccess(res))
            .catch(err => {
                onFailure(err);
                console.error(err);
            });
    }

    /**
     * Reset the user password
     * @type {(code: string, password: string, onSuccess: function, onFailure: function) => void}
     * @param code Verification code sent by email
     * @param password New password
     * @param onSuccess Callback with the time
     * @param onFailure When an error occur
     */
    reset_password(code, password, onSuccess, onFailure) {
        this.rpc.call("reset_password", {code: code, password: password})
            .then(res => onSuccess(res))
            .catch(err => {
                onFailure(err);
                console.error(err);
            });
    }
}

if (window.navigator.onLine) {
    Api.checkIfLoggedAndAct(Api.backend);
    Api.checkIfGroupAndAct(Api.backend);
}
