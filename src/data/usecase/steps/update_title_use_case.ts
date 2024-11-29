import {ParamUseCase} from "../base/param_usecase";
import {Execution} from "../../model/execution";
import {IssueRepository} from "../../repository/issue_repository";
import {Result} from "../../model/result";
import * as core from '@actions/core';

export class UpdateTitleUseCase implements ParamUseCase<Execution, Result[]> {
    taskId: string = 'UpdateTitleUseCase';
    private issueRepository = new IssueRepository();

    async invoke(param: Execution): Promise<Result[]> {
        core.info(`Executing ${this.taskId}.`)

        const result: Result[] = []
        try {
            if (param.issueAction) {
                if (param.mustRun) {
                    if (param.emojiLabeledTitle) {
                        const title = await this.issueRepository.updateTitle(
                            param.owner,
                            param.repo,
                            param.issue.title,
                            param.issue.number,
                            param.issueType,
                            param.hotfix.active,
                            param.labels.isQuestion,
                            param.labels.isHelp,
                            param.labels.feature,
                            param.labels.bugfix,
                            param.labels.release,
                            param.tokens.token,
                        );
                        if (title) {
                            result.push(
                                new Result({
                                    id: this.taskId,
                                    success: true,
                                    executed: true,
                                    steps: [
                                        `The issue's title was updated from \`${param.issue.title}\` to \`${title}\`.`,
                                    ]
                                })
                            )
                        } else {
                            result.push(
                                new Result({
                                    id: this.taskId,
                                    success: true,
                                    executed: false,
                                })
                            )
                        }
                    } else {
                        result.push(
                            new Result({
                                id: this.taskId,
                                success: true,
                                executed: false,
                            })
                        )
                    }
                } else {
                    const title = await this.issueRepository.cleanTitle(
                        param.owner,
                        param.repo,
                        param.issue.title,
                        param.issue.number,
                        param.tokens.token,
                    );
                    if (title) {
                        result.push(
                            new Result({
                                id: this.taskId,
                                success: true,
                                executed: true,
                                steps: [
                                    `The issue's title was updated from \`${param.issue.title}\` to \`${title}\`.`,
                                ]
                            })
                        )
                    } else {
                        result.push(
                            new Result({
                                id: this.taskId,
                                success: true,
                                executed: false,
                            })
                        )
                    }
                }
            }
        } catch (error) {
            result.push(
                new Result({
                    id: this.taskId,
                    success: false,
                    executed: true,
                    steps: [
                        `Tried to update issue's title, but there was a problem.`,
                    ],
                    error: error,
                })
            )
        }
        return result
    }
}