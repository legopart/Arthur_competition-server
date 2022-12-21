//const
const mongoDBConnectionString = 'mongodb+srv://w3arthur:mgj9H4532Y1EmyPB@w3arthur.zxq9q3x.mongodb.net/' + 'competition'; //'mongodb+srv://legopart:WfHIGKcxMGsllNS4@cluster0.uwlwx.mongodb.net/' + 'competition';
const PORT = process.env.PORT || 1333;
const PASSWORD = 'arthur55'

//functions
const func_fiveRandomChars = () => ((Math.random() + 1).toString(36).substring(7));


const path = require('path');
const express = require("express");
const { createServer } = require("http");
const app = express();
const server = createServer(app);
const mongoose = require("mongoose");


//mongodb
function makeNewConnection(uri) {
    const db = mongoose.createConnection(uri, { useNewUrlParser: true, useUnifiedTopology: true, });
    db.on('error', function (error) { console.log(`MongoDB :: connection ${this.name} ${JSON.stringify(error)}`); db.close().catch(() => console.log(`MongoDB :: failed to close connection ${this.name}`)); });
    db.on('connected', function () { console.log(`MongoDB :: connected ${this.name}`); /* mongoose.set('debug', function (col, method, query, doc) { console.log(`MongoDB :: ${this.conn.name} ${col}.${method}(${JSON.stringify(query)},${JSON.stringify(doc)})`); });*/ });
    db.on('disconnected', function () { console.log(`MongoDB :: disconnected ${this.name}`); });
    return db;
}

const mongoose1 = makeNewConnection(mongoDBConnectionString);

const TeamSchema = new mongoose.Schema(
    {
        team_id: { type: Number, unique: true, index: true, default: 1 }
        , secret_key: { type: String, trim: true, index: true, default: func_fiveRandomChars(), unique: true }
        , members: { type: String, trim: true, default: "" }
        , marks: { type: [Object], default: [] }    //tasks
        , total_mark: { type: Number, default: 0, index: -1 }
        , createdAt: { type: Date, index: -1 },
    }
    , { timestamps: true, }
);
const TeamModel = mongoose1.model("Team", TeamSchema); //teams

const TaskSchema = new mongoose.Schema(
    {
        task_id: { type: Number, unique: true, index: true, default: 1 }
        , title: { type: String, trim: true, default: "" }
        , createdAt: { type: Date, index: -1 },
    }
    , { timestamps: true, }
);
const TaskModel = mongoose1.model("Task", TaskSchema); //tasks



const calculateTeamMarks = async (team) => {
    let totalMark = 0;
    team.marks.map(async (task) => {
        if (task.mark != NaN)
            totalMark += task.mark * 1;
    });

    try {
        //can check the availability from db of the tas;
        const filter = { _id: team._id.toString() };
        const data = { $set: { total_mark: totalMark || 0 } };
        console.log(team._id.toString())
        const update = await TeamModel.findOneAndUpdate(filter, data);
        if (!update) throw new Error('cant update team total mark');
    } catch (e) { console.log('error'); console.log(e); }

    return totalMark;
}

const countTotalMark = async () => {
    try {
        let filter = {}
        const sort = { createdAt: -1 };
        const teams = await TeamModel.find(filter).sort(sort);
        if (!teams) throw new Error("cant find the team");
        const errors = [];
        await Promise.all(teams.map(
            async (team) => {
                try {
                    await calculateTeamMarks(team);
                } catch (e) { errors.push(e); }
            }
        ));
        if (errors) throw new Error('some issue with calculation');
    } catch (e) { }
}



//app express routers:
app.use(require("cors")());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));


app.use(express.static(path.join(__dirname, 'client')));    //public folder
app.route("/").all(async (req, res) => { return res.sendFile(path.join(__dirname + 'client/index.html')); });
app.route("/total").all(async (req, res) => { return res.sendFile(path.join(__dirname + 'client/total/index.html')); });
app.route("/test").all(async (req, res) => {
    return res.status(200).send("server test");
});

app.route('/api/total/')
    .get(async (req, res) => {
        console.log("GET /api/total load teams amd total marks for the tasks");
        try {
            let filter = {};
            const sort = { total_mark: -1 };

            try {
                await countTotalMark();
            } catch (e) { }


            const teams = await TeamModel.find(filter).sort(sort);
            if (!teams) throw new Error("no teams found");

            const result = teams.map(
                (team) => {
                    let task_done = 0;
                    team.marks.map((x) => {
                        try {
                            task_done += x.mark * 1 > 0 ? 1 : 0;
                        } catch (e) { }

                    });

                    return ({ team_id: team.team_id, team_members: team.members, total_mark: team.total_mark, task_done: task_done });
                }
            );
            return res.status(200).json(result);   //array
        } catch (e) { return res.status(400).send(JSON.stringify(e)); }
    });


app.route('/api/selected/:team_id')
    .get(async (req, res) => {
        console.log("GET /api/selected/:team_id load the selected team task");
        try {
            const { team_id } = req.params;

            let filter = { secret_key: team_id, };
            const team = await TeamModel.findOne(filter);
            if (!team) throw new Error("cant find the team");

            const result = async () => {
                const tasks = await Promise.all(team.marks.map(
                    async (x) => {
                        try {
                            if (x.selected === true) {
                                filter = { _id: x.task_id }
                                const task = await TaskModel.findOne(filter);
                                if (!task) throw new Error();
                                return { task_id: task.task_id, title: task.title };
                            }
                        } catch (e) { }
                    }
                ));
                return ({
                    team_id: team.team_id
                    , team_members: team.members
                    , team_tasks: tasks
                });
            };

            return res.status(200).json(await result());   //array
        } catch (e) { return res.status(400).send(JSON.stringify(e)); }
    });



app.use('/api', async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization']
        if (authHeader.trim() !== PASSWORD) throw new Error();
        else next();
    } catch (e) { return res.status(400).send('auth fail'); }
});


app.route('/api/teams')
    .get(async (req, res) => {
        console.log("GET /api/teams load the teams");
        try {
            await countTotalMark();

            const data = {};
            const sort = { createdAt: 1 };
            const result = await TeamModel.find(data).sort(sort);
            if (!result) throw new Error("fail to load the teams");
            return res.status(200).json(result);   //array
        } catch (e) { return res.status(400).send(JSON.stringify(e)); }
    })
    .post(async (req, res) => {
        console.log("POST /api/teams creating a team");
        try {
            let data = {};
            const sort = { createdAt: -1 };
            const select_filter = 'team_id';
            const find = await TeamModel.findOne(data).sort(sort).limit(1).skip(0).select(select_filter);
            if (!find) {
                const result = await TeamModel({}).save();
                if (!result) throw new Error("no data team 1");
                return res.status(200).json(result);
            }

            data = { team_id: find.team_id * 1 + 1 }
            const result = await TeamModel(data).save();
            if (!result) throw new Error("fail to create a team");
            return res.status(200).json(result);
        } catch (e) { return res.status(400).send(JSON.stringify(e)); }
    })
    .patch(async (req, res) => {
        console.log("PATCH /api/teams creating a team");
        try {
            const { team_id, members, task_id, mark, select } = req.body;
            // console.log(team_id)
            console.log(req.body)
            if (!team_id) throw new Error("no team id");
            else if (task_id && mark) {
                const selected_set = select ? true : false;

                let filter = { _id: task_id };
                const task = await TaskModel.findOne(filter);
                if (!task) throw new Error("no such task");

                filter = { _id: team_id }
                const team = await TeamModel.findOne(filter);
                if (!team) throw new Error("cant find the team");
                if (team.marks.some((mark) => mark.task_id.toString() === task_id)) {
                    console.log(true)
                    const update_filter = { _id: team_id, "marks.task_id": task_id };
                    const update_data = { $set: { "marks.$.mark": mark, "marks.$.selected": selected_set, } }
                    const update = await TeamModel.findOneAndUpdate(update_filter, update_data);
                    if (!update) throw new Error("cant set the team task mark");
                } else {
                    const set_data = {
                        $addToSet: {
                            marks: { task_id: task_id, mark: mark, selected: selected_set }
                        }
                    };
                    const set = await TeamModel.findOneAndUpdate(filter, set_data);
                    if (!set) throw new Error("cant set the team task mark");
                }

                try {
                    const team2 = await TeamModel.findOne(filter);
                    await calculateTeamMarks(team2);
                } catch (e) { }


                const result = await TeamModel.findOne(filter);
                //if (!result) throw new Error("error to return value");
                return res.status(200).json(result);
            } else if (task_id) {

                let filter = { _id: task_id };
                const task = await TaskModel.findOne(filter);
                if (!task) throw new Error("no such task");

                filter = { _id: team_id }
                const team = await TeamModel.findOne(filter);
                if (!team) throw new Error("cant find the team");

                if (team.marks.some((mark) => mark.task_id.toString() === task_id)) {
                    const filterUpdate = { _id: team_id, "marks.task_id": task_id };
                    const dataUpdate = { $set: { "marks.$.selected": select ? true : false } };
                    const update = await TeamModel.findOneAndUpdate(filterUpdate, dataUpdate);
                    if (!update) throw new Error("cant update selected");
                } else {
                    console.log("!!!!")
                    const set_data = {
                        $addToSet: {
                            marks: { task_id: task_id, selected: select ? true : false }
                        }
                    };
                    const set = await TeamModel.findOneAndUpdate(filter, set_data);
                    if (!set) throw new Error("cant set the team task mark");
                }
                const filterResults = { _id: team_id };
                const result = await TeamModel.findOne(filterResults);
                return res.status(200).json(result);

            } else if (members) {
                const filter = { _id: team_id }
                const data = { members: members }
                const set = await TeamModel.findOneAndUpdate(filter, data);
                if (!set) throw new Error("cant set the team members");
                const result = await TeamModel.findOne(filter);
                //if (!result) throw new Error("error to return value");
                return res.status(200).json(result);
            }
            throw new Error("no members or mark data");
        } catch (e) { console.log(e); return res.status(400).send(JSON.stringify(e)); }
    });



app.route('/api/tasks')
    .get(async (req, res) => {
        console.log("GET /api/tasks load the tasks");
        try {
            const data = {};
            const sort = { createdAt: 1 };
            const result = await TaskModel.find(data).sort(sort);
            if (!result) throw new Error("fail to load the tasks");
            return res.status(200).json(result);   //array
        } catch (e) { return res.status(400).send(JSON.stringify(e)); }
    })
    .post(async (req, res) => {
        console.log("POST /api/tasks creating a task");
        try {
            let data = {};
            const sort = { createdAt: -1 };
            const select_filter = 'task_id';
            const find = await TaskModel.findOne(data).sort(sort).limit(1).skip(0).select(select_filter);
            console.log(find)
            if (!find) {
                const result = await TaskModel({}).save();
                if (!result) throw new Error("no data task 1");
                return res.status(200).json(result);
            }

            data = { task_id: find.task_id * 1 + 1 }
            const result = await TaskModel(data).save();
            if (!result) throw new Error("fail to create a task");
            return res.status(200).json(result);
        } catch (e) { return res.status(400).send(JSON.stringify(e)); }
    })
    .patch(async (req, res) => {
        console.log("PATCH /api/tasks creating a task");
        try {
            const { task_id, title } = req.body;
            // console.log(task_id)
            // console.log(title)
            if (!task_id) throw new Error("no task id");
            if (title) {
                const filter = { _id: task_id }
                const data = { title: title }
                const set = await TaskModel.findOneAndUpdate(filter, data);
                if (!set) throw new Error("cant set the task members");
                const result = await TaskModel.findOne(filter);
                //if (!result) throw new Error("error to return value");
                return res.status(200).json(result);
            }
            throw new Error("no members or mark data");
        } catch (e) { return res.status(400).send(JSON.stringify(e)); }
    });



app.route("*").all((req, res) => res.status(404).send("fail " + req.path));

server.listen(PORT, () => console.log(`${(new Date().toISOString())} Server is listening on port ${PORT}, (Express + WS)`));