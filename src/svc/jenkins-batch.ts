import _ from "lodash";
import { Executor } from "../api/executor";
import logger from "../utils/logger";

export class JenkinsBatch {

    [key: string]: Function | Executor;

    constructor(private readonly executor: Executor) {
    }

    async execute(text: string) {
        const commands = text.split('\n');
        let ignoreErrors = false;
        const results: string[] = [];
        for (let lineCmd of commands) {
            if (lineCmd === '') {
                continue;
            } else if (lineCmd.startsWith('#!') && lineCmd.indexOf('ignoreErrors=true') > 0) {
                ignoreErrors = true;
            } else if (lineCmd.startsWith('#')) {
                continue;
            }

            try {
                let cmdString: string;
                if (lineCmd.indexOf('#') > 0) {
                    cmdString = lineCmd.substring(0, lineCmd.indexOf('#'));
                } else {
                    cmdString = lineCmd;
                }

                const cmds = cmdString.trim().split(' ').filter(cmd => cmd);
                if (cmds[0].indexOf('-') > 0) {
                    cmds[0] = cmds[0].replace(/-/g, '_');
                }
                const cmd = _.camelCase(cmds[0]);
                if (typeof this[cmd] === 'function') {
                    logger.debug(`execute: ${cmd}`);
                    const result: string | string[] = await (this[cmd] as Function)(...cmds.slice(1));
                    results.push(`* ${cmds[0].toUpperCase()}\n`);
                    if (Array.isArray(result)) {
                        results.push(...result);
                    } else {
                        results.push(result);
                    }
                    results.push('\n');
                } else {
                    logger.warn(`execute ${cmd} is not supported`);
                }
            } catch (error: any) {
                logger.error(error.message);
                logger.info(error.message);
                if (!ignoreErrors) {
                    break;
                }
            }
        }
        return results.join('\n');
    }

    async createUser(username: string, password: string) {
        logger.info(`Creating user: ${username} with password: ${password}`);
        const result = await this.executor.createUser(username, password);
        return `user <${username}>: ${result ? 'Success' : 'Failed'}`;
    }

    async deleteUser(...users: string[]) {
        logger.info(`delete user: ${users}`);
        const results = [];
        for (const user of users) {
            logger.info(`Creating user: ${user}`);
            const result = await this.executor.deleteUser(user);
            results.push(`user <${user}>: ${result ? 'Success' : 'Failed'}`);
        }
        return results;
    }

    async createViews(...views: string[]) {
        const results = [];
        for (const view of views) {
            logger.info(`Creating view: ${view}`);
            const result = await this.executor.createView(view);
            results.push(`view <${view}>: ${result ? 'Success' : 'Failed'}`);
        }
        return results;
    }

    async createView(viewname: string, regex: string) {
        const results = [];
        logger.info(`Creating view: ${viewname}`);
        const result = await this.executor.createView(viewname, regex);
        results.push(`view <${viewname}>: ${result ? 'Success' : 'Failed'}`);
        return results;
    }

    async deleteView(...views: string[]) {
        const results = [];
        for (const view of views) {
            logger.info(`Deleting view: ${view}`);
            const result = await this.executor.deleteView(view);
            results.push(`view <${view}>: ${result ? 'Success' : 'Failed'}`);
        }
        return results;
    }

    async createFolder(...folders: string[]) {
        const results = [];
        for (const folder of folders) {
            logger.info(`Creating folder: ${folder}`);
            const result = await this.executor.createFolder(folder);
            results.push(`folder <${folder}>: ${result ? 'Success' : 'Failed'}`);
        }
        return results;
    }

    async createPipeline(jobName: string, viewName: string = 'all') {
        const results = [];
        logger.info(`Creating jobName: ${jobName}`);
        const result = await this.executor.createPipelineJob(jobName, viewName);
        results.push(`pipeline <${jobName}>: ${result ? 'Success' : 'Failed'}`);
        return results;
    }

    async createShortcut(shortcutName: string, url: string, viewName: string = 'all') {
        const results = [];
        logger.info(`Creating shortcutName: ${shortcutName}`);
        const result = await this.executor.createShortcut(shortcutName, url, viewName);
        results.push(`shortcut <${shortcutName}>: ${result ? 'Success' : 'Failed'}`);
        return results;
    }

    async renameJob(uri: string, newName: string) {
        const results = [];
        logger.info(`Rename Job: ${uri}`);
        const result = await this.executor.renameJob(uri, newName);
        results.push(`job <${uri}>: ${result ? 'Success' : 'Failed'}`);
        return results;
    }

    async moveJob(uri: string, newName: string) {
        const results = [];
        logger.info(`Move Job: ${uri}`);
        const result = await this.executor.moveJob(uri, newName);
        results.push(`job <${uri}>: ${result ? 'Success' : 'Failed'}`);
        return results;
    }

    async deleteFolder(...folders: string[]) {
        const results = [];
        for (const folder of folders) {
            logger.info(`Deleting folder: ${folder}`);
            const result = await this.executor.deleteJobWithUri(folder);
            results.push(`folder <${folder}>: ${result ? 'Success' : 'Failed'}`);
        }
        return results;
    }

    async deleteJob(...jobs: string[]) {
        const results = [];
        for (const job of jobs) {
            logger.info(`Deleting job: ${job}`);
            const result = await this.executor.deleteJobWithUri(job);
            results.push(`job <${job}>: ${result ? 'Success' : 'Failed'}`);
        }
        return results;
    }

}
