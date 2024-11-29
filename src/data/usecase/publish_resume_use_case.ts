import {IssueRepository} from "../repository/issue_repository";
import {ParamUseCase} from "./base/param_usecase";
import {Execution} from "../model/execution";
import {Result} from "../model/result";
import {PullRequestRepository} from "../repository/pull_request_repository";
import {getRandomElement} from "../utils/list_utils";
import * as core from '@actions/core';

/**
 * Publish the resume of actions
 */
export class PublishResultUseCase implements ParamUseCase<Execution, void> {
    taskId: string = 'PublishResultUseCase';
    private issueRepository = new IssueRepository();
    private pullRequestRepository = new PullRequestRepository();

    async invoke(param: Execution): Promise<void> {
        core.info(`Executing ${this.taskId}.`)

        try {
            /**
             * Comment resume of actions
             */
            let title = ''
            let content = ''
            let stupidGif = ''
            let image: string | undefined
            let footer = ''
            if (param.issueAction) {
                if (param.mustCleanAll) {
                    title = '🗑️ Cleanup Actions'
                    image = getRandomElement(param.giphy.cleanUpGifs)
                } else if (param.hotfix.active) {
                    title = '🔥🐛 Hotfix Actions'
                    image = getRandomElement(param.giphy.hotfixGifs)
                } else if (param.isBugfix) {
                    title = '🐛 Bugfix Actions'
                    image = getRandomElement(param.giphy.bugfixGifs)
                } else if (param.isFeature) {
                    title = '🛠️ Feature Actions'
                    image = getRandomElement(param.giphy.featureGifs)
                }
            } else if (param.pullRequestAction) {
                title = '🛠️ Pull Request Linking Summary'
                image = getRandomElement(param.giphy.prLinkGifs)
            }

            if (image) {
                stupidGif = `![image](${image})`
            }

            let indexStep = 0
            param.currentConfiguration.results.forEach(r => {
                for (const step of r.steps) {
                    content += `${indexStep + 1}. ${step}\n`
                    indexStep++
                }
            });

            let indexReminder = 0
            param.currentConfiguration.results.forEach(r => {
                for (const reminder of r.reminders) {
                    footer += `${indexReminder + 1}. ${reminder}\n`
                    indexReminder++
                }
            });

            if (footer.length > 0) {
                footer = `
## Reminder

${footer}
`
            }

            const commentBody = `# ${title}:
${content}

${stupidGif}

${footer}

Thank you for contributing! 🙌
            `;

            if (content.length === 0) {
                return;
            }

            if (param.issueAction) {
                await this.issueRepository.addComment(
                    param.owner,
                    param.repo,
                    param.issue.number,
                    commentBody,
                    param.tokens.token,
                )
            } else if (param.pullRequestAction) {
                await this.pullRequestRepository.addComment(
                    param.owner,
                    param.repo,
                    param.pullRequest.number,
                    commentBody,
                    param.tokens.token,
                )
            }
        } catch (error) {
            console.error(error);
            param.currentConfiguration.results.push(
                new Result({
                    id: this.taskId,
                    success: false,
                    executed: true,
                    steps: [
                        `Tried to publish the resume, but there was a problem.`,
                    ],
                    error: error,
                })
            )
        }
    }
}