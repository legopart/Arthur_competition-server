
const fetchURL = 'https://2022.zionet.online/api/selected/';

const finishLoaded = (callback) => { document.addEventListener('DOMContentLoaded', async () => { await callback(); }); };
const elementApp = document.querySelector('#app');
const getElement = (id) => { if (typeof id === 'string') return document.getElementById(id); else if (typeof id === 'object') return id; };
const clickEvent = (id, externalFunction) => { if (typeof id == 'string') return getElement(id).addEventListener('click', (e) => { externalFunction(e) }); else if (typeof id === 'object') return id.addEventListener('click', (e) => { externalFunction(e) }); };
const submitPrevent = (e) => { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); }; //only for type="submit" issue
const getPageHash = () => { const pageHash = window.location.hash; return pageHash.substring(1); }

const team_id = getElement('team_id');
const team_members = getElement('team_members');
const team_tasks = getElement('team_tasks');
let pageHash_store;

const taskElement = (task) => {
    return `
        <li class="list-group-item"> 
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-terminal" viewBox="0 0 16 16">
                <path d="M6 9a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3A.5.5 0 0 1 6 9zM3.854 4.146a.5.5 0 1 0-.708.708L4.793 6.5 3.146 8.146a.5.5 0 1 0 .708.708l2-2a.5.5 0 0 0 0-.708l-2-2z"/>
                <path d="M2 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2H2zm12 1a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h12z"/>
            </svg> 
            ${task}
        </li>
    `;
};


const loadElements = async () => {
    const previous = {
        team_id: team_id.innerHTML
        , team_members: team_members.innerHTML
        , team_tasks: team_tasks.innerHTML
    };
    team_id.innerHTML = "Please reload";
    team_members.innerHTML = "";
    team_tasks.innerHTML = "No tasks to display";
    const pageHash = getPageHash() || pageHash_store;
    try {
        const data = await fetch(fetchURL + pageHash);
        if (data.ok == false) throw new Error('no data file url');
        const results = await data.json();

        if (previous.team_id != team_id.innerHTML)
            team_id.innerHTML = 'Team #' + results.team_id;
        if (previous.team_members != team_members.innerHTML)
            team_members.innerHTML = results.team_members;

        let taskList = '';
        for (const task of results.team_tasks) {
            if (task) taskList += taskElement(task.task_id + ' ' + task.title) + '\n';
        }
        if (previous.team_tasks != team_tasks.innerHTML)
            team_tasks.innerHTML = taskList;

        //team_tasks.innerHTML = total;
    } catch (e) {
        console.log('error: ' + e.message);
        team_members.innerHTML = `#Loading issue, please check the hash code`;
    }
};

finishLoaded(async () => {

    pageHash_store = getPageHash();
    await loadElements();
    const intervalTime = 2.5 * 60 * 1000;
    setInterval(async () => {
        if (getPageHash() === '') { team_members.innerHTML = `#Loading issue, please check the hash code`; }
        else await loadElements();
    }, intervalTime);
});

