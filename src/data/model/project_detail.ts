export class ProjectDetail {
    id: string;
    type: string;
    owner: string;
    url: string;
    number: number;

    constructor(data: any) {
        this.id = data[`id`] ?? '';
        this.type = data[`type`] ?? '';
        this.owner = data[`owner`] ?? '';
        this.url = data[`url`] ?? '';
        this.number = data[`number`] ?? -1;
    }
}