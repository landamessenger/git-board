import {Config} from "../model/config";
import * as core from "@actions/core";

export class DescriptionUtils {
    private get id(): string {
        return 'git-board-flow'
    }

    private get startJsonConfigPattern(): string {
        return `<!-- ${this.id}-json-start`
    }

    private get endJsonConfigPattern(): string {
        return `${this.id}-json-end -->`
    }

    updateConfig = (content: string, config: Config) => {
        try {
            const configBlock = `${this.startJsonConfigPattern} 
${JSON.stringify(config, null, 4)}
${this.endJsonConfigPattern}`;

            if (content.indexOf(this.startJsonConfigPattern) === -1
                && content.indexOf(this.endJsonConfigPattern) === -1) {
                return `${content}\n\n${configBlock}`;
            }

            if (content.indexOf(this.startJsonConfigPattern) === -1
                || content.indexOf(this.endJsonConfigPattern) === -1) {
                console.error(`The content has a problem with open-close tags: ${this.startJsonConfigPattern} / ${this.endJsonConfigPattern}`);
                return undefined;
            }

            const storedConfig = content.split(this.startJsonConfigPattern)[1].split(this.endJsonConfigPattern)[0]
            const oldContent = `${this.startJsonConfigPattern}${storedConfig}${this.endJsonConfigPattern}`
            const updatedDescription = content.replace(oldContent, '')

            return `${updatedDescription}\n\n${configBlock}`;
        } catch (error) {
            console.error(`Error updating issue description: ${error}`);
            return undefined;
        }
    }

    readConfig = (content: string | undefined): Config | undefined => {
        try {
            if (content === undefined) {
                return undefined;
            }
            if (content.indexOf(this.startJsonConfigPattern) === -1 || content.indexOf(this.endJsonConfigPattern) === -1) {
                return undefined;
            }

            const config = content.split(this.startJsonConfigPattern)[1].split(this.endJsonConfigPattern)[0]

            const branchConfig = JSON.parse(config);

            return new Config(branchConfig);
        } catch (error) {
            core.error(`Error reading issue configuration: ${error}`);
            throw error;
        }
    }
}
