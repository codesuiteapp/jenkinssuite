import FormData from 'form-data';
import * as vscode from 'vscode';
import { Executor } from '../api/executor';
import JenkinsConfiguration from '../config/settings';
import { ReservationJobModel, ReservationScheduler } from '../svc/reservation';
import { ParametersDefinitionProperty } from '../types/jenkins-types';
import { JobsModel } from '../types/model';
import { showInfoMessageWithTimeout } from '../ui/ui';
import { getLocalDate } from '../utils/datetime';
import { getParameterDefinition } from '../utils/model-utils';

export class ReservationProvider implements vscode.TreeDataProvider<ReservationJobModel> {

    private _executor: Executor | undefined;

    private reservationScheduler: ReservationScheduler;

    private _order: boolean = true;

    private _onDidChangeTreeData: vscode.EventEmitter<ReservationJobModel | undefined> = new vscode.EventEmitter<ReservationJobModel | undefined>();

    readonly onDidChangeTreeData: vscode.Event<ReservationJobModel | ReservationJobModel[] | undefined> = this._onDidChangeTreeData.event;

    constructor(protected context: vscode.ExtensionContext) {
        context.subscriptions.push(
            vscode.commands.registerCommand('utocode.cancelReservation', async (reservationJobModel: ReservationJobModel) => {
                this.cancelReservation(reservationJobModel);
            }),
            vscode.commands.registerCommand('utocode.reservation.refresh', () => {
                this.refresh();
            }),
            vscode.commands.registerCommand('utocode.reservation.sort', () => {
                this.order = !this.order;
                this.refresh();
            }),
            vscode.commands.registerCommand('utocode.reservation.info', () => {
                showInfoMessageWithTimeout(vscode.l10n.t('This feature is not guaranteed to run because it runs in VS Code, not on the server'));
                this.refresh();
            }),
        );
        this.reservationScheduler = new ReservationScheduler(this);
    }

    async getTreeItem(element: ReservationJobModel): Promise<vscode.TreeItem> {
        // console.log(`reservation::treeItem <${element}>`);
        let treeItem: vscode.TreeItem = {
            label: `[${getLocalDate(element.runTime)}] ${element.jobModel.name}`,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            contextValue: 'reservation',
            iconPath: new vscode.ThemeIcon('watch'),
            tooltip: this.getToolTip(element)
        };
        return treeItem;
    }

    getToolTip(element: ReservationJobModel): string | vscode.MarkdownString | undefined {
        const text = new vscode.MarkdownString();
        text.appendMarkdown(`### Job:\n`);
        text.appendMarkdown(`* name: ${element.jobModel.jobDetail?.fullDisplayName ?? element.jobModel.name}\n`);
        text.appendMarkdown('\n---\n');

        text.appendMarkdown(`### Parameters: \n`);
        // const jobParams = getParameterDefinition(element.jobModel.jobDetail ?? undefined);
        // if (jobParams && jobParams.length > 0) {
        //     for (let param of jobParams[0].parameterDefinitions) {
        //         text.appendMarkdown(`* ${param.name}\n`);
        //     }
        // } else {
        //     text.appendMarkdown('* __None__\n');
        // }
        const formParams: Map<string, string> = element.formParams;
        if (formParams.size > 0) {
            for (const [key, val] of formParams.entries()) {
                text.appendMarkdown(`* ${key}: **${val}**\n`);
            }
        } else {
            text.appendMarkdown('* __None__\n');
        }
        text.appendMarkdown('\n---\n');

        text.appendMarkdown(`**${getLocalDate(element.runTime)}**\n`);
        return text;
    }

    async getChildren(element?: ReservationJobModel): Promise<ReservationJobModel[]> {
        if (!this._executor) {
            return [];
        }

        const models = this.reservationScheduler.reservationModel.slice();
        if (this.order) {
            return models;
        } else {
            return models.sort((a, b) => b.runTime - a.runTime);
        }
    }

    public async addReservation(job: JobsModel) {
        let delayInMinutesStr = await vscode.window.showInputBox({
            prompt: 'Enter the time you want it to run [3 ~ 120]',
            value: '5'
        });
        if (!delayInMinutesStr) {
            return;
        }

        const delayInMinutes = Number.parseInt(delayInMinutesStr);
        if (delayInMinutes < 3 || delayInMinutes > 120) {
            showInfoMessageWithTimeout(vscode.l10n.t('The input time is {0} ~ {1} minutes', 3, 120));
            return;
        }
        this.registerReservation(job, delayInMinutes * 60);
    }

    public async addMultiReservation(jobs: JobsModel[]) {
        let delayInMinutesStr = await vscode.window.showInputBox({
            prompt: 'Enter the time you want it to run [3 ~ 120]',
            value: '5'
        });
        if (!delayInMinutesStr) {
            return;
        }

        const delayInMinutes = Number.parseInt(delayInMinutesStr);
        if (delayInMinutes < 3 || delayInMinutes > 120) {
            showInfoMessageWithTimeout(vscode.l10n.t('The input time is {0} ~ {1} minutes', 3, 120));
            return;
        }
        for (let job of jobs) {
            this.registerReservation(job, delayInMinutes * 60);
        }
    }

    async registerReservation(job: JobsModel, delayInSeconds: number = 60) {
        const jobParams = getParameterDefinition(job.jobDetail ?? undefined);
        const formParams = new Map<string, string>();
        let flag: boolean = true;
        if (jobParams && jobParams.length > 0) {
            for (let param of jobParams[0].parameterDefinitions) {
                if (param._class === ParametersDefinitionProperty.wHideParameterDefinition.toString()) {
                    continue;
                }

                const result = await vscode.window.showInputBox({
                    prompt: 'Enter "' + param.description ?? '' + '"',
                    value: param.defaultParameterValue.value
                }).then((val) => {
                    return val;
                });

                if (result) {
                    formParams.set(param.name, result);
                } else {
                    flag = false;
                    break;
                }
            }
            if (formParams.size === 0) {
                formParams.set('_', job.url);
            }
        }
        if (flag) {
            this.reservationScheduler.scheduleAction(job, delayInSeconds, formParams);
            this.refresh();
        } else {
            showInfoMessageWithTimeout('Cancelled by user');
        }
    }

    public async cancelReservation(reservationModel: ReservationJobModel) {
        this.reservationScheduler.cancelAction(reservationModel);
        this.refresh();
    }

    public get executor() {
        if (!this._executor) {
            showInfoMessageWithTimeout(vscode.l10n.t('Server is not connected'));
        }
        return this._executor;
    }

    public set executor(executor: Executor | undefined) {
        this._executor = executor;
        this.reservationScheduler.executor = executor;
        this.refresh();
    }

    public reservationJobModel(): ReservationJobModel[] {
        return this.reservationScheduler.reservationModel;
    }

    public get order(): boolean {
        return this._order;
    }

    public set order(order: boolean) {
        this._order = order;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

}
