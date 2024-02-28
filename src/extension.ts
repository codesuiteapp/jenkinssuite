import * as vscode from 'vscode';
import JenkinsConfiguration from './config/settings';
import { BuildsProvider } from './provider/builds-provider';
import { ConnectionProvider } from './provider/connection-provider';
import { JobsProvider } from './provider/jobs-provider';
import { JenkinsCodeLensProvider } from './provider/languages/jenkins-codelens';
import { JenkinsHoverProvider } from './provider/languages/jenkins-hover-provider';
import { JenkinsPipelineSymbolProvider } from './provider/languages/jenkins-symbol-provider.ts';
import { JshxHoverProvider } from './provider/languages/jshx-hover-provider';
import { JshxDocumentSymbolProvider } from './provider/languages/jshx-symbol-provider';
import { XmlCodeLensProvider } from './provider/languages/xml-codelens';
import { NotifyProvider } from './provider/notify-provider';
import { ProjectProvider } from './provider/project-provider';
import { ReservationProvider } from './provider/reservation-provider';
import { SnippetProvider } from './provider/snippet-provider';
import { ViewsProvider } from './provider/views-provider';
import { getConfigPath } from './utils/file';
import { vscExtension } from './vsc-ns';

export async function activate(context: vscode.ExtensionContext) {
	vscExtension.context = context;

	const buildsProvider = new BuildsProvider(context);
	const reservationProvider = new ReservationProvider(context);
	const jobsProvider = new JobsProvider(context, buildsProvider, reservationProvider);
	const viewsProvider = new ViewsProvider(context, jobsProvider);
	const notifyProvider = new NotifyProvider(context);
	const connectionProvider = new ConnectionProvider(context, viewsProvider, jobsProvider, buildsProvider, reservationProvider, notifyProvider);
	const projectProvider = new ProjectProvider(context);

	vscode.window.registerTreeDataProvider("viewsView", viewsProvider);
	vscode.window.registerTreeDataProvider("jobsView", jobsProvider);
	vscode.window.registerTreeDataProvider("buildsView", buildsProvider);
	vscode.window.registerTreeDataProvider("notifyView", notifyProvider);
	vscode.window.registerTreeDataProvider("connectionView", connectionProvider);

	const snippetProvider = new SnippetProvider(context);
	vscode.window.registerTreeDataProvider("reservationView", reservationProvider);
	vscode.window.registerTreeDataProvider("snippetsView", snippetProvider);

	const jenkinsSymbolProvider = new JenkinsPipelineSymbolProvider();
	const jshxSymbolProvider = new JshxDocumentSymbolProvider();
	const symbolProviders = [
		{ language: 'jenkins', scheme: 'file', provider: jenkinsSymbolProvider },
		{ language: 'jenkins', scheme: 'jkssh', provider: jenkinsSymbolProvider },
		{ language: 'jshx', scheme: 'file', provider: jshxSymbolProvider },
		{ language: 'jkssh', scheme: 'file', provider: jshxSymbolProvider },
		{ language: 'jshx', scheme: 'jshx', provider: jshxSymbolProvider },
		{ language: 'jkssh', scheme: 'jshx', provider: jshxSymbolProvider },
	];

	const jenkinsHoverProvider = new JenkinsHoverProvider();
	const jshxHoverProvider = new JshxHoverProvider();

	const hoverProviders = [
		{ language: 'jenkins', scheme: 'file', provider: jenkinsHoverProvider },
		{ language: 'jenkins', scheme: 'jshx', provider: jenkinsHoverProvider },
		{ language: 'jshx', scheme: 'file', provider: jshxHoverProvider },
		{ language: 'jshx', scheme: 'jshx', provider: jshxHoverProvider },
		{ language: 'jkssh', scheme: 'file', provider: jshxHoverProvider },
		{ language: 'jkssh', scheme: 'jshx', provider: jshxHoverProvider },
	];

	context.subscriptions.push(
		vscode.window.createTreeView('jenkinsProject', {
			treeDataProvider: projectProvider
		}),
		vscode.workspace.onDidChangeWorkspaceFolders(async () => {
			showProjectView(projectProvider);
		}),
		vscode.commands.registerCommand("utocode.welcome", () => {
			vscode.commands.executeCommand(`workbench.action.openWalkthrough`, `utocode.jenkinssuite#utocode.welcome`, false);
		}),
		vscode.languages.registerCodeLensProvider(['jenkins', 'jshx', 'jkssh', 'groovy'], new JenkinsCodeLensProvider(context)),
		vscode.languages.registerCodeLensProvider(['xml'], new XmlCodeLensProvider(context)),
		vscode.workspace.onDidSaveTextDocument(async (document: vscode.TextDocument) => {
			const customFile = JenkinsConfiguration.snippetCustomFilePath;
			if (customFile && document.fileName.endsWith(customFile)) {
				await vscode.commands.executeCommand('utocode.snippets.refresh');
			} else if (document.fileName.endsWith('.jenkinsrc.json')) {
				showProjectView(projectProvider);
			}
		}),
		vscode.workspace.onDidChangeConfiguration(handleConfigChange)
	);

	for (const { language, scheme, provider } of symbolProviders) {
		vscode.languages.registerDocumentSymbolProvider({ language, scheme }, provider);
	}

	for (const { language, scheme, provider } of hoverProviders) {
		vscode.languages.registerHoverProvider({ language, scheme }, provider);
	}

	// const scriptProvider = new ScriptProvider(context);
	showProjectView(projectProvider);
	function registerCommand(cmd: string, callback: () => void) {
		const command = vscode.commands.registerCommand(cmd, callback);
		context.subscriptions.push(new Command(cmd, command));
	}
}

export function deactivate() {
}

async function handleConfigChange(event: vscode.ConfigurationChangeEvent) {
	if (event.affectsConfiguration('jenkinssuite.servers')) {
		console.log('Configuration has been changed.');
		await vscode.commands.executeCommand('utocode.connections.refresh');
	}
}

class Command {
	constructor(public cmdId: string, private command: vscode.Disposable) {
	}
	public dispose() {
		return this.command.dispose();
	}
}

async function hasJenkinsProject(): Promise<boolean> {
	if (!vscode.workspace.workspaceFolders) {
		return false;
	}

	let hasAny = false;
	for (const folder of vscode.workspace.workspaceFolders) {
		hasAny = !!await getConfigPath(folder.uri);
		if (hasAny) {
			return hasAny;
		}
	}

	return hasAny;
}

async function showProjectView(projectProvider: ProjectProvider) {
	if (await hasJenkinsProject()) {
		projectProvider.refresh();
	}
}
