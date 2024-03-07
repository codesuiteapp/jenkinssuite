import * as vscode from 'vscode';
import JenkinsConfiguration, { JenkinsServer } from "../config/settings";
import { ConnectionProvider } from '../provider/connection-provider';
import { JobsProvider } from '../provider/jobs-provider';
import { BallColor } from '../types/jenkins-types';
import { JobModelType, JobsModel, ModelQuickPick } from '../types/model';
import { showInfoMessageWithTimeout } from "./ui";

export async function switchConnection(context: vscode.ExtensionContext, connectionProvider: ConnectionProvider) {
    const servers = JenkinsConfiguration.servers;
    if (!servers) {
        showInfoMessageWithTimeout(vscode.l10n.t("Server is not exists"));
        return;
    }

    const homeBtn: vscode.QuickInputButton = {
        iconPath: new vscode.ThemeIcon('globe'),
        tooltip: 'Home'
    };

    const userBtn: vscode.QuickInputButton = {
        iconPath: new vscode.ThemeIcon('account'),
        tooltip: 'User'
    };

    const items: ModelQuickPick<JenkinsServer>[] = [];
    for (const [name, server] of servers) {
        items.push({
            label: (connectionProvider.currentServer?.name === name ? '$(sync)' : '$(device-desktop)') + ` ${server.description ?? server.name} (${name})`,
            description: `${server.username}`,
            detail: server.url,
            model: server,
            buttons: [homeBtn, userBtn]
        });
    }

    const quickPick = vscode.window.createQuickPick<ModelQuickPick<JenkinsServer>>();
    quickPick.title = vscode.l10n.t("Jenkins Server");
    quickPick.placeholder = vscode.l10n.t("Select to switch server");
    // quickPick.ignoreFocusOut = true;
    quickPick.matchOnDetail = true;
    quickPick.matchOnDescription = true;
    quickPick.items = items;

    quickPick.onDidAccept(async () => {
        const item = quickPick.selectedItems[0] as ModelQuickPick<JenkinsServer>;
        if (!item) {
            return;
        }

        await connectionProvider.connect(item.model!);
        quickPick.dispose();
    });

    quickPick.onDidTriggerItemButton(async (e) => {
        if (e.button.tooltip === 'Home') {
            await vscode.commands.executeCommand('utocode.openLink#Home', e.item.model);
        } else if (e.button.tooltip === 'User') {
            await vscode.commands.executeCommand('utocode.openLinkUserConfigure', e.item.model);
        }
    });

    quickPick.show();

}

export async function runJobAll(jobsProvider: JobsProvider, includeJob: boolean = true) {
    const jobs = await jobsProvider.getJobsWithView();
    if (!jobs || jobs.length === 0) {
        showInfoMessageWithTimeout(vscode.l10n.t('Jobs is not exists'));
        return;
    }

    const quickPick = vscode.window.createQuickPick<ModelQuickPick<JobsModel>>();
    quickPick.title = vscode.l10n.t("Build Job");
    quickPick.placeholder = vscode.l10n.t("Select the job you want to build");
    // quickPick.ignoreFocusOut = true;
    quickPick.matchOnDetail = true;
    quickPick.matchOnDescription = true;
    quickPick.items = await getJobsAsModel(jobsProvider, jobs, includeJob);

    quickPick.onDidAccept(async () => {
        const item = quickPick.selectedItems[0] as ModelQuickPick<JobsModel>;
        if (!item) {
            return;
        }

        await vscode.commands.executeCommand('utocode.buildJob', item.model);
        quickPick.dispose();
    });

    quickPick.onDidTriggerItemButton(async (e) => {
        if (e.button.tooltip === 'Config') {
            await vscode.commands.executeCommand('utocode.getConfigJob', e.item.model, true);
        } else if (e.button.tooltip === 'Log') {
            await jobsProvider.getJobLogByJob(e.item.model as JobsModel, 0);
        }
    });

    quickPick.show();
}

export async function getJobsAsModel(jobsProvider: JobsProvider, jobs: JobsModel[], includeJob: boolean = true): Promise<ModelQuickPick<JobsModel>[]> {
    const fileBtn: vscode.QuickInputButton = {
        iconPath: vscode.ThemeIcon.File,
        tooltip: 'Config'
    };

    const logBtn: vscode.QuickInputButton = {
        iconPath: new vscode.ThemeIcon('console'),
        tooltip: 'Log'
    };

    const items: ModelQuickPick<JobsModel>[] = [];
    if (includeJob) {
        const jobTypes = [JobModelType.freeStyleProject.toString(), JobModelType.workflowJob.toString(), JobModelType.workflowMultiBranchProject.toString()];
        let idx = 0;
        for (const job of jobs) {
            if (!jobTypes.includes(job._class) || !job.jobDetail?.buildable) {
                continue;
            }
            if (idx % 5 === 0) {
                items.push({
                    label: '',
                    kind: vscode.QuickPickItemKind.Separator
                });
            }
            items.push({
                label: (job._class === JobModelType.freeStyleProject ? "$(terminal) " : "$(tasklist) ") + job.name,
                description: job.jobDetail?.description ? job.jobDetail?.description : job.jobDetail?.displayName,
                model: job,
                buttons: [fileBtn, logBtn]
            });
            idx++;
        }
        items.push({
            label: '',
            kind: vscode.QuickPickItemKind.Separator
        });
    }

    for (const job of jobs) {
        if (job._class !== JobModelType.folder.toString()) {
            continue;
        }

        const folderJobsModel: JobsModel[] | undefined = await jobsProvider.getJobsWithFolder(job);
        if (folderJobsModel) {
            for (let folderJob of folderJobsModel) {
                items.push({
                    label: (folderJob._class === JobModelType.freeStyleProject ? "$(terminal) " : "$(tasklist) ") + folderJob.name,
                    description: folderJob.jobDetail?.description ? folderJob.jobDetail?.description : folderJob.name,
                    detail: `${job.name}`,
                    model: folderJob
                });
            }
        }
        items.push({
            label: '',
            kind: vscode.QuickPickItemKind.Separator
        });
    }

    return items;
}

export async function getFolderAsModel(jobs: JobsModel[], selectedJob: JobsModel): Promise<ModelQuickPick<JobsModel>[]> {
    const items: ModelQuickPick<JobsModel>[] = [];
    const jobTypes = [JobModelType.folder.toString()];
    const rootJob: JobsModel = {
        name: '',
        url: '',
        healthReport: [],
        color: BallColor.notbuilt,
        buildable: false,
        fullName: 'Jenkins',
        fullDisplayName: 'Jenkins',
        _class: ''
    };

    items.push({
        label: `$(root-folder-opened) Jenkins`,
        description: `${rootJob.fullName}`,
        model: rootJob
    });

    let idx = 1;
    for (const job of jobs) {
        if (!jobTypes.includes(job._class)) {
            continue;
        }
        if (selectedJob.name === job.name) {
            continue;
        }
        if (idx % 5 === 0) {
            items.push({
                label: '',
                kind: vscode.QuickPickItemKind.Separator
            });
        }
        items.push({
            label: (job._class === JobModelType.freeStyleProject ? "$(terminal) " : "$(folder) ") + job.name,
            description: job.jobDetail?.description ? job.jobDetail?.description : job.jobDetail?.displayName,
            model: job
        });
        idx++;
    }
    return items;
}
