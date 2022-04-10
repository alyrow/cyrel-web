class InTheSauce {
    static shema = {
        type: "object",
        title: "UE",
        properties: {
            name: {
                type: "string"
            },
            require: {
                type: "number",
                minimum: 0,
                maximum: 20
            },
            subjects: {
                type: "array",
                items: {
                    type: "object",
                    title: "Matières",
                    properties: {
                        name: {
                            type: "string"
                        },
                        require: {
                            type: "number",
                            minimum: 0,
                            maximum: 20
                        },
                        "n-1": {
                            type: "string",
                            enum: [
                                "all",
                                "partial",
                                "none"
                            ]
                        },
                        marks: {
                            type: "array",
                            items: {
                                type: "object",
                                title: "Notes",
                                properties: {
                                    name: {
                                        type: "string"
                                    },
                                    "n-1": {
                                        type: "boolean"
                                    },
                                    coef: {
                                        type: "number",
                                        exclusiveMinimum: 0
                                    }
                                }
                            },
                            uniqueItems: true
                        },
                        coef: {
                            type: "number",
                            exclusiveMinimum: 0
                        }
                    }
                },
                uniqueItems: true
            }
        }
    };
    name
    require
    subjects
    marksDb = {}

    constructor(data, elem, callback) {
        this.name = data.name;
        this.require = data.require;
        this.subjects = data.subjects;

        if (this.load())
            this.marksDb = this.load();

        new Template("in-the-sauce", {"name": this.name, "subjects": this.subjects}, elem, () => {
            this.subjects.forEach(subject => {
                new Template("subject-marks", {
                    "marks": subject.marks,
                    "subject": subject.name
                }, document.getElementById("subject-" + subject.name), () => {
                    subject.marks.forEach(mark => {
                        const markElem = document.getElementById(`subject-${subject.name}-${mark.name}`);
                        if (this.marksDb[`${this.name}-${subject.name}-${mark.name}`] !== null && this.marksDb[`${this.name}-${subject.name}-${mark.name}`] !== undefined)
                            markElem.children[0].value = this.marksDb[`${this.name}-${subject.name}-${mark.name}`];
                        markElem.addEventListener("input", () => {
                            if (markElem.children[0].value === "") {
                                markElem.classList.remove("error");
                                this.setMark(subject.name, mark.name, null);
                                return;
                            }
                            const m = parseFloat(markElem.children[0].value);
                            if (m >= 0 && m <= 20) {
                                markElem.classList.remove("error");
                                this.setMark(subject.name, mark.name, m);
                            } else {
                                markElem.classList.add("error");
                                this.setMark(subject.name, mark.name, null);
                            }
                        });
                    });
                    this.computeAvg();
                });
            });
            if (typeof callback === "function") {
                callback();
            }
        });
    }

    setMark(subject, markName, mark) {
        this.marksDb[`${this.name}-${subject}-${markName}`] = mark;

        this.computeAvg();
        this.save();
    }

    computeAvg() {
        const avgs = [];
        for (let i = 0; i < this.subjects.length; i++) {
            let subAvg;
            const n1Rule = this.subjects[i]["n-1"];
            const markN1 = [];
            const markOther = [];
            let marks = [];
            for (let j = 0; j < this.subjects[i].marks.length; j++) {
                if (this.marksDb[`${this.name}-${this.subjects[i].name}-${this.subjects[i].marks[j].name}`] !== null && this.marksDb[`${this.name}-${this.subjects[i].name}-${this.subjects[i].marks[j].name}`] !== undefined) {
                    if (this.subjects[i].marks[j]["n-1"]) {
                        markN1.push({
                            m: this.marksDb[`${this.name}-${this.subjects[i].name}-${this.subjects[i].marks[j].name}`],
                            c: this.subjects[i].marks[j].coef
                        });
                    } else {
                        markOther.push({
                            m: this.marksDb[`${this.name}-${this.subjects[i].name}-${this.subjects[i].marks[j].name}`],
                            c: this.subjects[i].marks[j].coef
                        });
                    }
                }
            }
            switch (n1Rule) {
                case "all": {
                    if (markN1.length > 0)
                        markN1.splice(markN1.indexOf(markN1.reduce(
                            (acc, mark) =>
                                acc.m < mark.m
                                    ? acc
                                    : mark,
                            0
                        )), 1);
                    break;
                }
                case "partial": {
                    if (markN1.length > 0)
                        if (markN1.reduce((p, c) => p + c.m * c.c, 0) / markN1.reduce((p, c) => p + c.c, 0) < 10) {
                            markN1.splice(markN1.indexOf(markN1.reduce(
                                (acc, mark) =>
                                    acc.m < mark.m
                                        ? acc
                                        : mark,
                                0
                            )), 1);
                        }
                    break;
                }
            }
            marks = marks.concat(markN1, markOther);
            if (marks.length > 0) {
                subAvg = (marks.reduce((p, c) => p + c.m * c.c, 0)) / (marks.reduce((p, c) => p + c.c, 0));
                const ribon = document.getElementById(`avg-${this.subjects[i].name}`);
                ribon.innerText = subAvg;
                if (subAvg < this.subjects[i].require) {
                    ribon.classList.remove("orange", "green");
                    ribon.classList.add("red");
                } else if (subAvg < 10) {
                    ribon.classList.remove("red", "green");
                    ribon.classList.add("orange");
                } else {
                    ribon.classList.remove("orange", "red");
                    ribon.classList.add("green");
                }
                avgs.push({m: subAvg, c: this.subjects[i].coef});
            }
        }
        if (avgs.length > 0) {
            const avg = (avgs.reduce((p, c) => p + c.m * c.c, 0)) / (avgs.reduce((p, c) => p + c.c, 0));
            const ribon = document.getElementById(`--avg`);
            ribon.innerText = avg;
            if (avg < this.require) {
                ribon.classList.remove("orange", "green");
                ribon.classList.add("red");
            } else if (avg < 10) {
                ribon.classList.remove("red", "green");
                ribon.classList.add("orange");
            } else {
                ribon.classList.remove("orange", "red");
                ribon.classList.add("green");
            }
        }
    }

    load() {
        return JSON.parse(localStorage.getItem("_" + this.name + "_data"));
    }

    save() {
        localStorage.setItem("_" + this.name + "_data", JSON.stringify(this.marksDb));
    }

    delete() {
        localStorage.removeItem("_" + this.name + "_data");
    }
}

if (localStorage.getItem("sauce") === null) {
    const element = document.getElementById('code1');

    const editor = new JSONEditor(element, {
        theme: "formanticui",
        schema: InTheSauce.shema,
        no_additional_properties: true,
        disable_properties: true
    });

    $('.ui.overlay.fullscreen.modal')
        .modal({
            onApprove: () => {
                localStorage.setItem("sauce", JSON.stringify(editor.getValue()));
                document.location.reload();
            },
            onDeny: () => false,
            closable: false
        })
        .modal('show')
    ;
} else {
    UiCore.registerTag("in-the-sauce", element => {
        const inTheSauce = new InTheSauce(JSON.parse(localStorage.getItem("sauce")), element, () => {
            document.getElementById("button-delete").onclick = () => {
                inTheSauce.delete();
                localStorage.removeItem("sauce");
                document.location.reload();
            }
            document.getElementById("button-modify").onclick = () => {
                const element = document.getElementById('code2');

                const editor = new JSONEditor(element, {
                    theme: "formanticui",
                    schema: InTheSauce.shema,
                    no_additional_properties: true,
                    disable_properties: true
                });
                editor.on('ready', () => {
                    editor.setValue(JSON.parse(localStorage.getItem("sauce")));
                });
                $('.ui.e.modal')
                    .modal({
                        onApprove: () => {
                            localStorage.setItem("sauce", JSON.stringify(editor.getValue()));
                            document.location.reload();
                        }
                    })
                    .modal('show')
                ;
            }
        });
    });
}
