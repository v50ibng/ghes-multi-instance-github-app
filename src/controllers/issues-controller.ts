import type { Request, Response } from 'express';
import { IssueService } from '../services/issue-service';

export class IssuesController {
  constructor(private readonly issueService: IssueService) {}

  async createIssue(req: Request, res: Response): Promise<void> {
    const response = await this.issueService.createIssue(req.body);
    res.status(response.created ? 201 : 200).json(response);
  }
}
