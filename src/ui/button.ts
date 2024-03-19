import { QuickInputButton, QuickInputButtons, ThemeIcon } from 'vscode';
import { Constants } from '../svc/constants';

const homeBtn: QuickInputButton = {
    iconPath: new ThemeIcon('globe'),
    tooltip: 'Home'
};

const userBtn: QuickInputButton = {
    iconPath: new ThemeIcon('account'),
    tooltip: 'User'
};

const configBtn: QuickInputButton = {
    iconPath: new ThemeIcon('edit'),
    tooltip: Constants.CONFIG_BUTTON
};

const logBtn: QuickInputButton = {
    iconPath: new ThemeIcon('console'),
    tooltip: Constants.LOG_BUTTON
};

const runBtn: QuickInputButton = {
    iconPath: new ThemeIcon('run'),
    tooltip: Constants.RUN_BUTTON
};

const linkBtn: QuickInputButton = {
    iconPath: new ThemeIcon('link-external'),
    tooltip: Constants.OPEN_LINK_BUTTON
};

export const serverWindowBtn: QuickInputButton = {
    iconPath: new ThemeIcon('server'),
    tooltip: Constants.SERVER_WINDOW_BUTTON
};

export const viewWindowBtn: QuickInputButton = {
    iconPath: new ThemeIcon('preview'),
    tooltip: Constants.VIEW_WINDOW_BUTTON
};

export const jobWindowBtn: QuickInputButton = {
    iconPath: new ThemeIcon('project'),
    tooltip: Constants.JOB_WINDOW_BUTTON
};

export const manageButtons = [homeBtn, userBtn];

export const jobButtons = [runBtn, configBtn, logBtn, linkBtn];

export const buildButtons = [configBtn, logBtn];

export const viewButtons = [configBtn, linkBtn];

export const viewHeaderButtons = [QuickInputButtons.Back, jobWindowBtn];

export const jobHeaderButtons = [QuickInputButtons.Back, serverWindowBtn];

export const buildHeaderButtons = [QuickInputButtons.Back, serverWindowBtn, viewWindowBtn];
