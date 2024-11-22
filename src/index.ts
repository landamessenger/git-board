import * as core from '@actions/core';
import {PullRequestLinkUseCase} from "./data/usecase/pull_request_link_use_case";
import {IssueLinkUseCase} from "./data/usecase/issue_link_use_case";
import {ProjectRepository} from "./data/repository/project_repository";
import {ProjectDetail} from "./data/model/project_detail";
import {Execution} from "./data/model/execution";
import {Tokens} from "./data/model/tokens";
import {Labels} from "./data/model/labels";
import {Branches} from "./data/model/branches";
import {Hotfix} from "./data/model/hotfix";
import {RemoveIssueBranchesUseCase} from "./data/usecase/remove_issue_branches_use_case";
import {Result} from "./data/model/result";
import {PublishResultUseCase} from "./data/usecase/publish_resume_use_case";
import {StoreConfigurationUseCase} from "./data/usecase/store_configuration_use_case";

async function run(): Promise<void> {
    const projectRepository = new ProjectRepository();
    const action = core.getInput('action', {required: true});

    /**
     * Tokens
     */
    const token = core.getInput('github-token', {required: true});
    const tokenPat = core.getInput('github-token-personal', {required: true});

    /**
     * Projects Details
     */
    const projectUrlsInput = core.getInput('project-urls', {required: true});
    const projectUrls: string[] = projectUrlsInput
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);

    const projects: ProjectDetail[] = []
    for (const projectUrl of projectUrls) {
        const detail = await projectRepository.getProjectDetail(projectUrl, tokenPat)
        projects.push(detail)
    }

    /**
     * Runs always
     */
    const runAlways = core.getInput('run-always', {required: true}) === 'true';

    /**
     * Emoji-title
     */
    const titleEmoji = core.getInput('emoji-labeled-title', {required: true}) === 'true';

    /**
     * Labels
     */
    const actionLauncherLabel = core.getInput('action-launcher-label', {required: true});
    const bugfixLabel = core.getInput('bugfix-label', {required: true});
    const hotfixLabel = core.getInput('hotfix-label', {required: true});
    const featureLabel = core.getInput('feature-label', {required: true});
    const questionLabel = core.getInput('question-label', {required: true});
    const helpLabel = core.getInput('help-label', {required: true});

    /**
     * Branches
     */
    const mainBranch = core.getInput('main-branch', {required: true});
    const developmentBranch = core.getInput('development-branch', {required: true});
    const featureTree = core.getInput('feature-tree', {required: true});
    const bugfixTree = core.getInput('bugfix-tree', {required: true});
    const hotfixTree = core.getInput('hotfix-tree', {required: true});

    const execution = new Execution(
        runAlways,
        titleEmoji,
        action === 'issue',
        action === 'pull-request',
        new Tokens(token, tokenPat),
        new Labels(
            actionLauncherLabel,
            bugfixLabel,
            hotfixLabel,
            featureLabel,
            questionLabel,
            helpLabel,
        ),
        new Branches(
            mainBranch,
            developmentBranch,
            featureTree,
            bugfixTree,
            hotfixTree,
        ),
        new Hotfix(),
        projects
    )

    await execution.setup();

    if (execution.number === -1) {
        core.setFailed(`Issue ${execution.number}. Skipping.`);
        return;
    }

    const results: Result[] = []

    if (execution.mustCleanAll) {
        results.push(...await new RemoveIssueBranchesUseCase().invoke(execution));
        await finishWithResults(execution, results)
        return;
    }

    if (!execution.mustRun) {
        core.setFailed(`Issue ${execution.number}. Skipping.`);
        return;
    }

    try {
        if (execution.issueAction) {
            results.push(...await new IssueLinkUseCase().invoke(execution));
        } else if (execution.pullRequestAction) {
            results.push(...await new PullRequestLinkUseCase().invoke(execution));
        } else {
            core.setFailed(`Action not handled: ${action}`);
        }

        await finishWithResults(execution, results)
    } catch (error: any) {
        core.setFailed(error.message);
    }
}

async function finishWithResults(execution: Execution, results: Result[]): Promise<void> {
    execution.currentConfiguration.results = results;
    await new PublishResultUseCase().invoke(execution)
    await new StoreConfigurationUseCase().invoke(execution)
}

run();
