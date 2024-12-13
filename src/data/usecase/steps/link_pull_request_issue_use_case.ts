import {ParamUseCase} from "../base/param_usecase";
import {Execution} from "../../model/execution";
import {ProjectRepository} from "../../repository/project_repository";
import {error} from "@actions/core";
import {Result} from "../../model/result";
import * as github from "@actions/github";
import {PullRequestRepository} from "../../repository/pull_request_repository";
import * as core from '@actions/core';

export class LinkPullRequestIssueUseCase implements ParamUseCase<Execution, Result[]> {
    taskId: string = 'LinkPullRequestIssueUseCase';
    private pullRequestRepository = new PullRequestRepository();

    async invoke(param: Execution): Promise<Result[]> {
        core.info(`Executing ${this.taskId}.`)

        const result: Result[] = []

        try {
            const isLinked = await this.pullRequestRepository.isLinked(github.context.payload.pull_request?.html_url ?? '');

            if (!isLinked) {
                /**
                 *  Set the primary/default branch
                 */
                await this.pullRequestRepository.updateBaseBranch(
                    param.owner,
                    param.repo,
                    param.pullRequest.number,
                    param.branches.defaultBranch,
                    param.tokens.token,
                )

                result.push(
                    new Result({
                        id: this.taskId,
                        success: true,
                        executed: true,
                        steps: [
                            `The base branch was temporarily updated to \`${param.branches.defaultBranch}\`.`,
                        ],
                    })
                )

                /**
                 *  Update PR's description.
                 */
                let prBody = param.pullRequest.body;

                let updatedBody = `${prBody}\n\nResolves #${param.number}`;
                await this.pullRequestRepository.updateDescription(
                    param.owner,
                    param.repo,
                    param.pullRequest.number,
                    updatedBody,
                    param.tokens.token,
                );

                result.push(
                    new Result({
                        id: this.taskId,
                        success: true,
                        executed: true,
                        steps: [
                            `The description was temporarily modified to include a reference to issue **#${param.number}**.`,
                        ],
                    })
                )

                /**
                 *  Await 20 seconds
                 */
                await new Promise(resolve => setTimeout(resolve, 20 * 1000));

                /**
                 *  Restore the original branch
                 */
                await this.pullRequestRepository.updateBaseBranch(
                    param.owner,
                    param.repo,
                    param.pullRequest.number,
                    param.pullRequest.base,
                    param.tokens.token,
                )

                result.push(
                    new Result({
                        id: this.taskId,
                        success: true,
                        executed: true,
                        steps: [
                            `The base branch was reverted to its original value: \`${param.pullRequest.base}\`.`,
                        ],
                    })
                )

                /**
                 * Restore comment on description
                 */
                prBody = param.pullRequest.body;
                updatedBody = prBody.replace(`\n\nResolves #${param.number}`, "");
                await this.pullRequestRepository.updateDescription(
                    param.owner,
                    param.repo,
                    param.pullRequest.number,
                    updatedBody,
                    param.tokens.token,
                );

                result.push(
                    new Result({
                        id: this.taskId,
                        success: true,
                        executed: true,
                        steps: [
                            `The temporary issue reference **#${param.number}** was removed from the description.`,
                        ],
                    })
                )

                return result;
            }
        } catch (error) {
            console.error(error);
            result.push(
                new Result({
                    id: this.taskId,
                    success: false,
                    executed: true,
                    steps: [
                        `Tried to link pull request to project, but there was a problem.`,
                    ],
                    error: error,
                })
            )
        }
        return result;
    }
}