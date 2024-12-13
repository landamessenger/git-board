import * as github from "@actions/github";
import * as core from "@actions/core";
import {Milestone} from "../model/milestone";
import {Config} from "../model/config";
import {Labels} from "../model/labels";
import {DescriptionUtils} from "../utils/description_utils";

export class IssueRepository {
    private startConfigPattern = '<!-- GIT-BOARD-CONFIG-START'
    private endConfigPattern = 'GIT-BOARD-CONFIG-END -->'

    updateTitle = async (
        owner: string,
        repository: string,
        issueTitle: string,
        issueNumber: number,
        branchManagementAlways: boolean,
        branchManagementEmoji: string,
        labels: Labels,
        token: string,
    ): Promise<string | undefined> => {
        try {
            const octokit = github.getOctokit(token);

            let emoji = '🤖';

            const branched = branchManagementAlways || labels.containsBranchedLabel

            if (labels.isHotfix && branched) {
                emoji = `🔥${branchManagementEmoji}`;
            } else if (labels.isRelease && branched) {
                emoji = `🚀${branchManagementEmoji}`;
            } else if ((labels.isBugfix || labels.isBug) && branched) {
                emoji = `🐛${branchManagementEmoji}`;
            } else if ((labels.isFeature || labels.isEnhancement) && branched) {
                emoji = `✨${branchManagementEmoji}`;
            } else if (labels.isHotfix) {
                emoji = '🔥';
            } else if (labels.isRelease) {
                emoji = '🚀';
            } else if (labels.isBugfix || labels.isBug) {
                emoji = '🐛';
            } else if (labels.isFeature || labels.isEnhancement) {
                emoji = '✨';
            } else if (labels.isHelp) {
                emoji = '🆘';
            } else if (labels.isQuestion) {
                emoji = '❓';
            }

            let sanitizedTitle = issueTitle
                .replace(/[^\p{L}\p{N}\p{P}\p{Z}^$\n]/gu, '')
                .replace(/\u200D/g, '')
                .replace(/[^\S\r\n]+/g, ' ')
                .replace(/[^a-zA-Z0-9 ]/g, '')
                .replace(/^-+|-+$/g, '')
                .replace(/- -/g, '-').trim()
                .replace(/-+/g, '-')
                .trim();

            const formattedTitle = `${emoji} - ${sanitizedTitle}`;

            if (formattedTitle !== issueTitle) {
                await octokit.rest.issues.update({
                    owner: owner,
                    repo: repository,
                    issue_number: issueNumber,
                    title: formattedTitle,
                });

                core.info(`Issue title updated to: ${formattedTitle}`);
                return formattedTitle;
            }

            return undefined;
        } catch (error) {
            core.setFailed(`Failed to check or update issue title: ${error}`);
            return undefined;
        }
    };

    cleanTitle = async (
        owner: string,
        repository: string,
        issueTitle: string,
        issueNumber: number,
        token: string,
    ): Promise<string | undefined> => {
        try {
            const octokit = github.getOctokit(token);

            let sanitizedTitle = issueTitle
                .replace(/[^\p{L}\p{N}\p{P}\p{Z}^$\n]/gu, '')
                .replace(/\u200D/g, '')
                .replace(/[^\S\r\n]+/g, ' ')
                .replace(/[^a-zA-Z0-9 ]/g, '')
                .replace(/^-+|-+$/g, '')
                .replace(/- -/g, '-').trim()
                .replace(/-+/g, '-')
                .trim();

            if (sanitizedTitle !== issueTitle) {
                await octokit.rest.issues.update({
                    owner: owner,
                    repo: repository,
                    issue_number: issueNumber,
                    title: sanitizedTitle,
                });

                core.info(`Issue title updated to: ${sanitizedTitle}`);
                return sanitizedTitle;
            }

            return undefined;
        } catch (error) {
            core.setFailed(`Failed to check or update issue title: ${error}`);
            return undefined;
        }
    };


    updateDescription = async (
        owner: string,
        repo: string,
        issueNumber: number,
        description: string,
        token: string
    ) => {
        const octokit = github.getOctokit(token);
        try {
            await octokit.rest.issues.update({
                owner,
                repo,
                issue_number: issueNumber,
                body: description,
            });
        } catch (error) {
            console.error(`Error updating issue description: ${error}`);
            throw error;
        }
    }

    getDescription = async (
        owner: string,
        repo: string,
        issueNumber: number,
        token: string
    ): Promise<string | undefined> => {
        if (issueNumber === -1) {
            return undefined;
        }
        const octokit = github.getOctokit(token);
        try {
            const {data: issue} = await octokit.rest.issues.get({
                owner,
                repo,
                issue_number: issueNumber,
            });
            return issue.body ?? '';
        } catch (error) {
            core.error(`Error reading pull request configuration: ${error}`);
            return undefined
        }
    }

    getId = async (
        owner: string,
        repository: string,
        issueNumber: number,
        token: string,
    ): Promise<string> => {
        const octokit = github.getOctokit(token);

        const issueQuery = `
          query($repo: String!, $owner: String!, $issueNumber: Int!) {
            repository(name: $repo, owner: $owner) {
              issue(number: $issueNumber) {
                id
              }
            }
          }
        `;
        const issueResult: any = await octokit.graphql(issueQuery, {
            owner: owner,
            repo: repository,
            issueNumber,
        });

        const issueId = issueResult.repository.issue.id;
        core.info(`Fetched issue ID: ${issueId}`);

        return issueId;
    }

    fetchIssueProjects = async (
        owner: string,
        repo: string,
        issueNumber: number,
        token: string
    ): Promise<ProjectItem[]> => {
        try {
            const octokit = github.getOctokit(token);

            const query = `
            query($owner: String!, $repo: String!, $issueNumber: Int!) {
              repository(owner: $owner, name: $repo) {
                issue(number: $issueNumber) {
                  projectItems(first: 10) {
                    nodes {
                      id
                      project {
                        id
                        title
                        url
                      }
                    }
                  }
                }
              }
            }
        `;

            const response: IssueProjectsResponse = await octokit.graphql(query, {
                owner,
                repo,
                issueNumber,
            });

            return response.repository.issue.projectItems.nodes.map((item) => ({
                id: item.id,
                project: {
                    id: item.project.id,
                    title: item.project.title,
                    url: item.project.url,
                },
            }));
        } catch (error) {
            core.setFailed(`Error fetching issue projects: ${error}`);
            throw error;
        }
    };

    getMilestone = async (
        owner: string,
        repository: string,
        token: string,
        issueNumber: number,
    ): Promise<Milestone | undefined> => {
        const octokit = github.getOctokit(token);

        const {data: issue} = await octokit.rest.issues.get({
            owner: owner,
            repo: repository,
            issue_number: issueNumber,
        });

        if (issue.milestone) {
            return new Milestone(
                issue.milestone.id,
                issue.milestone.title,
                issue.milestone.description ?? '',
            )
        } else {
            return undefined
        }
    }

    getLabels = async (
        owner: string,
        repository: string,
        issueNumber: number,
        token: string,
    ): Promise<string[]> => {
        const octokit = github.getOctokit(token);
        const {data: labels} = await octokit.rest.issues.listLabelsOnIssue({
            owner: owner,
            repo: repository,
            issue_number: issueNumber,
        });
        return labels.map(label => label.name);
    }

    isHotfix = async (
        owner: string,
        repository: string,
        issueNumber: number,
        hotfixLabel: string,
        token: string,
    ): Promise<boolean> => {
        const labels = await this.getLabels(owner, repository, issueNumber, token)
        return labels.includes(hotfixLabel)
    }

    addComment = async (
        owner: string,
        repository: string,
        issueNumber: number,
        comment: string,
        token: string,
    ) => {
        const octokit = github.getOctokit(token);
        await octokit.rest.issues.createComment({
            owner: owner,
            repo: repository,
            issue_number: issueNumber,
            body: comment,
        });

        core.info(`Comment added to Issue ${issueNumber}.`);
    }

    closeIssue = async (
        owner: string,
        repository: string,
        issueNumber: number,
        token: string,
    ) => {
        const octokit = github.getOctokit(token);
        const {data: issue} = await octokit.rest.issues.get({
            owner: owner,
            repo: repository,
            issue_number: issueNumber,
        });

        core.info(`Issue #${issueNumber} state: ${issue.state}`);

        if (issue.state === 'open') {
            await octokit.rest.issues.update({
                owner: owner,
                repo: repository,
                issue_number: issueNumber,
                state: 'closed',
            });
            core.info(`Issue #${issueNumber} has been closed.`);
            return true;
        } else {
            core.info(`Issue #${issueNumber} is already closed.`);
            return false;
        }
    }

    openIssue = async (
        owner: string,
        repository: string,
        issueNumber: number,
        token: string,
    ) => {
        const octokit = github.getOctokit(token);
        const {data: issue} = await octokit.rest.issues.get({
            owner: owner,
            repo: repository,
            issue_number: issueNumber,
        });

        core.info(`Issue #${issueNumber} state: ${issue.state}`);

        if (issue.state === 'closed') {
            await octokit.rest.issues.update({
                owner: owner,
                repo: repository,
                issue_number: issueNumber,
                state: 'open',
            });
            core.info(`Issue #${issueNumber} has been re-opened.`);
            return true;
        } else {
            core.info(`Issue #${issueNumber} is already opened.`);
            return false;
        }
    }

    getCurrentAssignees = async (
        owner: string,
        repository: string,
        issueNumber: number,
        token: string
    ): Promise<string[]> => {
        const octokit = github.getOctokit(token);

        try {
            const {data: issue} = await octokit.rest.issues.get({
                owner,
                repo: repository,
                issue_number: issueNumber,
            });

            const assignees = issue.assignees
            if (assignees === undefined || assignees === null) {
                return [];
            }
            return assignees.map((assignee) => assignee.login);
        } catch (error) {
            core.error(`Error getting members of issue: ${error}.`);
            return [];
        }
    };

    assignMembersToIssue = async (
        owner: string,
        repository: string,
        issueNumber: number,
        members: string[],
        token: string
    ): Promise<string[]> => {
        const octokit = github.getOctokit(token);

        try {
            if (members.length === 0) {
                core.info(`No members provided for assignment. Skipping operation.`);
                return [];
            }

            const {data: updatedIssue} = await octokit.rest.issues.addAssignees({
                owner,
                repo: repository,
                issue_number: issueNumber,
                assignees: members,
            });

            const updatedAssignees = updatedIssue.assignees || [];
            return updatedAssignees.map((assignee) => assignee.login);
        } catch (error) {
            core.error(`Error assigning members to issue: ${error}.`);
            return [];
        }
    };


}