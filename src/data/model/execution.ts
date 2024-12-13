import {ProjectDetail} from "./project_detail";
import {Tokens} from "./tokens";
import {Labels} from "./labels";
import {Branches} from "./branches";
import {Hotfix} from "./hotfix";
import {PullRequestRepository} from "../repository/pull_request_repository";
import {IssueRepository} from "../repository/issue_repository";
import * as github from "@actions/github";
import {branchesForManagement, typesForIssue} from "../utils/label_utils";
import {Issue} from "./issue";
import {PullRequest} from "./pull_request";
import {extractIssueNumberFromBranch, extractIssueNumberFromBranchB} from "../utils/title_utils";
import {Config} from "./config";
import {Images} from "./images";
import {Commit} from "./commit";
import {Emoji} from "./emoji";
import {DescriptionUtils} from "../utils/description_utils";

export class Execution {
    number: number = -1
    commitPrefixBuilder: string;
    commitPrefixBuilderParams: any = {};
    emoji: Emoji;
    giphy: Images;
    tokens: Tokens;
    labels: Labels;
    branches: Branches;
    hotfix: Hotfix;
    issue: Issue;
    pullRequest: PullRequest;
    projects: ProjectDetail[];
    previousConfiguration: Config | undefined;
    currentConfiguration: Config;

    get eventName(): string {
        return github.context.eventName;
    }

    get isIssue(): boolean {
        return this.eventName === 'issues';
    }

    get isPullRequest(): boolean {
        return this.eventName === 'pull_request';
    }

    get isPush(): boolean {
        return this.eventName === 'push';
    }

    get repo(): string {
        return github.context.repo.repo;
    }

    get owner(): string {
        return github.context.repo.owner;
    }

    get isFeature(): boolean {
        return this.issueType === 'feature';
    }

    get isBugfix(): boolean {
        return this.issueType === 'bugfix';
    }

    get isBranched(): boolean {
        return this.issue.branchManagementAlways || this.labels.containsBranchedLabel;
    }

    get issueNotBranched(): boolean {
        return this.isIssue && !this.isBranched;
    }

    get managementBranch(): string {
        return branchesForManagement(
            this,
            this.labels.currentLabels,
            this.labels.bugfix,
            this.labels.hotfix,
            this.labels.release,
        );
    }

    get issueType(): string {
        return typesForIssue(
            this,
            this.labels.currentLabels,
            this.labels.bugfix,
            this.labels.hotfix,
            this.labels.release,
        );
    }

    get cleanIssueBranches(): boolean {
        return this.isIssue
            && this.previousConfiguration !== undefined
            && this.previousConfiguration?.branchType != this.currentConfiguration.branchType;
    }

    get commit(): Commit {
        return new Commit();
    }

    constructor(
        commitPrefixBuilder: string,
        issue: Issue,
        pullRequest: PullRequest,
        emoji: Emoji,
        giphy: Images,
        tokens: Tokens,
        labels: Labels,
        branches: Branches,
        hotfix: Hotfix,
        projects: ProjectDetail[],
    ) {
        this.commitPrefixBuilder = commitPrefixBuilder;
        this.issue = issue;
        this.pullRequest = pullRequest;
        this.giphy = giphy;
        this.tokens = tokens;
        this.emoji = emoji;
        this.labels = labels;
        this.branches = branches;
        this.hotfix = hotfix;
        this.projects = projects;
        this.currentConfiguration = new Config({});
    }

    setup = async () => {
        if (this.isIssue) {
            this.number = this.issue.number;
            const issueRepository = new IssueRepository();
            this.labels.currentLabels = await issueRepository.getLabels(
                this.owner,
                this.repo,
                this.number,
                this.tokens.token
            );
            this.hotfix.active = await issueRepository.isHotfix(
                this.owner,
                this.repo,
                this.issue.number,
                this.labels.hotfix,
                this.tokens.token,
            );
            this.previousConfiguration = new DescriptionUtils().readConfig(this.issue.body)
        } else if (this.isPullRequest) {
            const issueRepository = new IssueRepository();
            this.number = extractIssueNumberFromBranch(this.pullRequest.head);
            this.labels.currentLabels = await issueRepository.getLabels(
                this.owner,
                this.repo,
                this.pullRequest.number,
                this.tokens.token
            );
            this.hotfix.active = this.pullRequest.base.indexOf(`${this.branches.hotfixTree}/`) > -1
            this.previousConfiguration = new DescriptionUtils().readConfig(this.pullRequest.body)
        } else if (this.isPush) {
            this.number = extractIssueNumberFromBranchB(this.commit.branch)
            const issueRepository = new IssueRepository();
            const issueDescription = await issueRepository.getDescription(
                this.owner,
                this.repo,
                this.number,
                this.tokens.token,
            )
            this.previousConfiguration = new DescriptionUtils().readConfig(issueDescription)
        }
        this.currentConfiguration.branchType = this.issueType
    }
}