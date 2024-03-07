import { QuickInputButton, ThemeIcon } from 'vscode';

const configBtn: QuickInputButton = {
    iconPath: new ThemeIcon('edit'),
    tooltip: 'Config'
};

const logBtn: QuickInputButton = {
    iconPath: new ThemeIcon('console'),
    tooltip: 'Log'
};

const runBtn: QuickInputButton = {
    iconPath: new ThemeIcon('run'),
    tooltip: 'Run'
};

const linkBtn: QuickInputButton = {
    iconPath: new ThemeIcon('link-external'),
    tooltip: 'Open'
};

export const jobButtons = [runBtn, configBtn, logBtn, linkBtn];

export const buildButtons = [configBtn, logBtn];

export const viewButtons = [configBtn, linkBtn];
