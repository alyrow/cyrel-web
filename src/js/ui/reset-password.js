$('#reset_1')
    .form({
        onSuccess: function () {
            document.getElementById("check").click();
        },
        fields: {
            id: {
                identifier: 'id',
                rules: [
                    {
                        type: 'empty',
                        prompt: 'Merci de renseigner votre numéro étudiant'
                    },
                    {
                        type: 'integer',
                        prompt: 'Merci de renseigner un numéro d\'étudiant valide'
                    },
                    {
                        type: 'exactLength[8]',
                        prompt: 'Un numéro étudiant fait 8 caractères'
                    }
                ]
            },
            email: {
                identifier: 'email',
                rules: [
                    {
                        type: 'empty',
                        prompt: 'Merci de renseigner votre email'
                    },
                    {
                        type: 'email',
                        prompt: 'Merci de renseigner une adresse email valide'
                    }
                ]
            }
        }
    })
;

document.getElementById("check").onclick = () => {
    const jquerySelector = $('#reset_1');
    const elem = document.getElementById("reset_1");
    jquerySelector.form("validate form");
    if (jquerySelector.form("is valid")) {
        elem.classList.add("loading");
        Api.backend.send_password_reset_code(parseInt(jquerySelector.form("get values").id), jquerySelector.form("get values").email, success => {
            elem.classList.remove("loading");
            $('#form-check')
                .form({
                    onSuccess: function () {
                        document.getElementById("continue").click();
                    },
                    fields: {
                        code: {
                            identifier: 'code',
                            rules: [
                                {
                                    type: 'empty',
                                    prompt: 'Merci de renseigner votre code de vérification'
                                }
                            ]
                        }
                    }
                })
            ;
            document.getElementById("check").style.display = "none";
            document.getElementById("check-code").style.display = "block";
        }, failure => {
            elem.classList.remove("loading");
            jquerySelector.form("add errors", [UiCore.translateError(failure)]);
        });
    }
};

document.getElementById("continue").onclick = () => {
    const jquerySelector = $('#form-check');
    const elem = document.getElementById("form-check");
    jquerySelector.form("validate form");
    if (jquerySelector.form("is valid")) {
        $('#reset_2')
            .form({
                onSuccess: function () {
                    document.getElementById("reset").click();
                },
                fields: {
                    firstname: {
                        identifier: 'firstname',
                        rules: [
                            {
                                type: 'empty',
                                prompt: 'Merci de renseigner votre prénom'
                            }
                        ]
                    },
                    lastname: {
                        identifier: 'lastname',
                        rules: [
                            {
                                type: 'empty',
                                prompt: 'Merci de renseigner votre nom'
                            }
                        ]
                    },
                    password: {
                        identifier: 'password',
                        rules: [
                            {
                                type: 'empty',
                                prompt: 'Merci de renseigner votre mot de passe'
                            },
                            {
                                type: 'minLength[8]',
                                prompt: 'Votre mot de passe doit faire {ruleValue} caractères minimum'
                            }
                        ]
                    },
                    password2: {
                        identifier: 'password2',
                        rules: [
                            {
                                type: 'match[password]',
                                prompt: 'Merci de confirmer votre mot de passe'
                            }
                        ]
                    }
                }
            });

        document.getElementById("continue").style.display = "none";
        document.getElementById("end").style.display = "block";
    }
};

document.getElementById("reset").onclick = () => {
    const jquerySelector = $('#reset_2');
    const elem = document.getElementById("reset_2");
    jquerySelector.form("validate form");
    if (jquerySelector.form("is valid")) {
        elem.classList.add("loading");
        Api.backend.reset_password($('#form-check').form("get values").code, jquerySelector.form("get values").password, success => {
            elem.classList.remove("loading");
            elem.classList.add("success");
            document.location.href = "/login.html";
        }, failure => {
            elem.classList.remove("loading");
            jquerySelector.form("add errors", [UiCore.translateError(failure)]);
        });
    }
};
