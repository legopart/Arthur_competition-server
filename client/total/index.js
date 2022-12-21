
const fetchURL = 'https://2022.zionet.online/api/total';//'http://localhost:1333/api/total'//

const finishLoaded = (callback) => { document.addEventListener('DOMContentLoaded', async () => { await callback(); }); };
const elementApp = document.querySelector('#app');
const getElement = (id) => { if (typeof id === 'string') return document.getElementById(id); else if (typeof id === 'object') return id; };
const clickEvent = (id, externalFunction) => { if (typeof id == 'string') return getElement(id).addEventListener('click', (e) => { externalFunction(e) }); else if (typeof id === 'object') return id.addEventListener('click', (e) => { externalFunction(e) }); };
const submitPrevent = (e) => { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); }; //only for type="submit" issue
const getPageHash = () => { const pageHash = window.location.hash; return pageHash.substring(1); }

const teams = getElement('teams');

const taskElement = (team_id, team_members, total_mark, task_done) => {
    return `
        <p class="list-group">
            <div id="team_id" class="list-group-item list-group-item-action active"><strong style="margin:0 50px">Team ${team_id}</strong>    Score: <strong type="button" style="margin:0 50px" class="btn btn-secondary font-weight-bold">${total_mark}</strong> Task Done:  <strong type="button" style="margin-left: 50px" class="btn btn-warning font-weight-bold">${task_done}</strong></div>
            <strong id="team_members" class="list-group-item list-group-item-action"> ${team_members} </strong>
        </p>
    `;
};


const loadElements = async () => {
    try {
        const data = await fetch(fetchURL);
        if (data.ok == false) throw new Error('no data file url');
        const results = await data.json();


        let teamList = '';
        console.log('results', results)
        results.map((team) => {
            try {
                console.log('team', team)
                const team_id = team.team_id || '?';
                const team_members = team.team_members || '?';
                const total_mark = team.total_mark || 0;
                const task_done = team.task_done || 0;
                console.log(team_id, team_members, total_mark, task_done)
                teamList += taskElement(team_id, team_members, total_mark, task_done);
            } catch (e) { }

        });

        teams.innerHTML = teamList;

        //team_tasks.innerHTML = total;
    } catch (e) {
        console.log('error: ' + e.message);
        team_members.innerHTML = `#Loading issue`;
    }
};

finishLoaded(async () => {
    await loadElements();
    const intervalTime = 2.5 * 60 * 1000;
    setInterval(async () => {
        await loadElements();
    }, intervalTime);
});

