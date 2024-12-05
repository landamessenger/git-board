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
import {Result} from "./data/model/result";
import {PublishResultUseCase} from "./data/usecase/publish_resume_use_case";
import {StoreConfigurationUseCase} from "./data/usecase/store_configuration_use_case";
import {Images} from "./data/model/images";
import {CommitCheckUseCase} from "./data/usecase/commit_check_use_case";
import {Emoji} from "./data/model/emoji";
import {Issue} from "./data/model/issue";
import {PullRequest} from "./data/model/pull_request";

async function run(): Promise<void> {
    const projectRepository = new ProjectRepository();

    /**
     * Tokens
     */
    const token = core.getInput('github-token', {required: true});
    const tokenPat = core.getInput('github-token-personal', {required: true});

    /**
     * Projects Details
     */
    const projectUrlsInput = core.getInput('project-urls');
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
     * Images
     */
    const imagesIssueAutomaticInput = core.getInput('images-issue-automatic');
    const imagesIssueAutomatic: string[] = imagesIssueAutomaticInput
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);


    const imagesIssueFeatureInput = core.getInput('images-issue-feature');
    const imagesIssueFeature: string[] = imagesIssueFeatureInput
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);


    const imagesIssueBugfixInput = core.getInput('images-issue-bugfix');
    const imagesIssueBugfix: string[] = imagesIssueBugfixInput
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);


    const imagesIssueHotfixInput = core.getInput('images-issue-hotfix');
    const imagesIssueHotfix: string[] = imagesIssueHotfixInput
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);

    const imagesPullRequestAutomaticInput = core.getInput('images-pull-request-automatic');
    const imagesPullRequestAutomatic: string[] = imagesPullRequestAutomaticInput
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);


    /**
     * Emoji-title
     */
    const titleEmoji = core.getInput('emoji-labeled-title') === 'true';
    const branchManagementEmoji = core.getInput('branch-management-emoji');

    /**
     * Labels
     */
    const branchManagementLauncherLabel = core.getInput('branch-management-launcher-label');
    const bugfixLabel = core.getInput('bugfix-label');
    const bugLabel = core.getInput('bug-label');
    const hotfixLabel = core.getInput('hotfix-label');
    const enhancementLabel = core.getInput('enhancement-label');
    const featureLabel = core.getInput('feature-label');
    const releaseLabel = core.getInput('release-label');
    const questionLabel = core.getInput('question-label');
    const helpLabel = core.getInput('help-label');

    /**
     * Branches
     */
    const mainBranch = core.getInput('main-branch');
    const developmentBranch = core.getInput('development-branch');
    const featureTree = core.getInput('feature-tree');
    const bugfixTree = core.getInput('bugfix-tree');
    const hotfixTree = core.getInput('hotfix-tree');
    const releaseTree = core.getInput('release-tree');

    /**
     * Prefix builder
     */
    const commitPrefixBuilder = core.getInput('commit-prefix-builder') ?? '';

    /**
     * Issue
     */
    const branchManagementAlways = core.getInput('branch-management-always') === 'true';
    const reopenIssueOnPush = core.getInput('reopen-issue-on-push') === 'true';
    const issueDesiredAssigneesCount = parseInt(core.getInput('desired-assignees-count')) ?? 0;

    /**
     * Pull Request
     */
    const pullRequestDesiredAssigneesCount = parseInt(core.getInput('desired-assignees-count')) ?? 0;


    const execution = new Execution(
        commitPrefixBuilder,
        new Issue(
            branchManagementAlways,
            reopenIssueOnPush,
            issueDesiredAssigneesCount
        ),
        new PullRequest(
            pullRequestDesiredAssigneesCount,
        ),
        new Emoji(
            titleEmoji,
            branchManagementEmoji,
        ),
        new Images(
            imagesIssueAutomatic,
            imagesIssueFeature,
            imagesIssueBugfix,
            imagesIssueHotfix,
            imagesPullRequestAutomatic,
        ),
        new Tokens(token, tokenPat),
        new Labels(
            branchManagementLauncherLabel,
            bugLabel,
            bugfixLabel,
            hotfixLabel,
            enhancementLabel,
            featureLabel,
            releaseLabel,
            questionLabel,
            helpLabel,
        ),
        new Branches(
            mainBranch,
            developmentBranch,
            featureTree,
            bugfixTree,
            hotfixTree,
            releaseTree,
        ),
        new Hotfix(),
        projects
    )

    await execution.setup();

    if (execution.number === -1) {
        core.info(`Issue number not found. Skipping.`);
        return;
    }

    const results: Result[] = []

    try {
        if (execution.isIssue) {
            results.push(...await new IssueLinkUseCase().invoke(execution));
        } else if (execution.isPullRequest) {
            results.push(...await new PullRequestLinkUseCase().invoke(execution));
        } else if (execution.isPush) {
            results.push(...await new CommitCheckUseCase().invoke(execution));
        } else {
            core.setFailed(`Action not handled.`);
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
