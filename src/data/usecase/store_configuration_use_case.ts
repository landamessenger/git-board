import {IssueRepository} from "../repository/issue_repository";
import {ParamUseCase} from "./base/param_usecase";
import {Execution} from "../model/execution";
import * as core from '@actions/core';
import {DescriptionUtils} from "../utils/description_utils";

/**
 * Store las configuration in the description
 */
export class StoreConfigurationUseCase implements ParamUseCase<Execution, void> {
    taskId: string = 'StoreConfigurationUseCase';
    private issueRepository = new IssueRepository();

    async invoke(param: Execution): Promise<void> {
        core.info(`Executing ${this.taskId}.`)
        try {
            if (param.isIssue) {
                const description = new DescriptionUtils().updateConfig(
                    param.issue.body,
                    param.currentConfiguration
                )
                if (description === undefined) {
                    return
                }
                await this.issueRepository.updateDescription(
                    param.owner,
                    param.repo,
                    param.issue.number,
                    description,
                    param.tokens.token,
                )
            } else if (param.isPullRequest) {
                const description = new DescriptionUtils().updateConfig(
                    param.pullRequest.body,
                    param.currentConfiguration
                )
                if (description === undefined) {
                    return
                }
                await this.issueRepository.updateDescription(
                    param.owner,
                    param.repo,
                    param.pullRequest.number,
                    description,
                    param.tokens.token,
                )
            }
        } catch (error) {
            console.error(error);
        }
    }
}
