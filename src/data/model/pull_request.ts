import * as github from "@actions/github";

export class PullRequest {
    desiredAssigneesCount: number;
    desiredReviewersCount: number;

    get action(): string {
        return github.context.payload.action ?? '';
    }

    get id(): string {
        return github.context.payload.pull_request?.node_id ?? '';
    }

    get title(): string {
        return github.context.payload.pull_request?.title ?? '';
    }

    get creator(): string {
        return github.context.payload.pull_request?.user.login ?? '';
    }

    get number(): number {
        return github.context.payload.pull_request?.number ?? -1;
    }

    get url(): string {
        return github.context.payload.pull_request?.html_url ?? '';
    }

    get body(): string {
        return github.context.payload.pull_request?.body ?? '';
    }

    get head(): string {
        return github.context.payload.pull_request?.head.ref ?? '';
    }

    get base(): string {
        return github.context.payload.pull_request?.base.ref ?? '';
    }

    get isMerged(): boolean {
        return github.context.payload.pull_request?.merged ?? false;
    }

    get isOpened(): boolean {
        return github.context.payload.pull_request?.state === 'open'
            && this.action !== 'closed';
    }

    get isClosed(): boolean {
        return github.context.payload.pull_request?.state === 'closed'
            || this.action === 'closed';
    }

    constructor(
        desiredAssigneesCount: number,
        desiredReviewersCount: number,
    ) {
        this.desiredAssigneesCount = desiredAssigneesCount;
        this.desiredReviewersCount = desiredReviewersCount;
    }
}