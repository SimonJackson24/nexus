import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import {
  listWorkflows,
  listWorkflowRuns,
  triggerWorkflow,
  cancelWorkflowRun,
  rerunWorkflow,
} from '@/lib/github/extended-api';

// GET /api/github/actions - List workflows and runs
export async function GET(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');

  try {
    const { searchParams } = new URL(request.url);
    const repo = searchParams.get('repo');
    const workflowId = searchParams.get('workflow_id');
    const branch = searchParams.get('branch');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '30');

    if (!repo) {
      return NextResponse.json({ error: 'Repository is required' }, { status: 400 });
    }

    const [owner, repoName] = repo.split('/');

    // List workflows
    if (!workflowId) {
      const workflows = await listWorkflows(userId!, owner, repoName);

      return NextResponse.json({
        repo,
        workflows: workflows.map((w) => ({
          id: w.id,
          name: w.name,
          path: w.path,
          state: w.state,
          created_at: w.created_at,
          updated_at: w.updated_at,
        })),
      });
    }

    // List workflow runs
    const runs = await listWorkflowRuns(userId!, owner, repoName, {
      workflowId: parseInt(workflowId),
      branch: branch || undefined,
      status: status || undefined,
      page,
      perPage,
    });

    return NextResponse.json({
      repo,
      workflow_id: workflowId,
      branch,
      status,
      page,
      runs: runs.map((run) => ({
        id: run.id,
        run_number: run.run_number,
        status: run.status,
        conclusion: run.conclusion,
        branch: run.head_branch,
        event: run.event,
        actor: run.actor?.login,
        created_at: run.created_at,
        updated_at: run.updated_at,
        run_started_at: run.run_started_at,
        run_completed_at: run.run_completed_at,
        html_url: run.html_url,
      })),
    });
  } catch (error) {
    console.error('List actions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/github/actions - Trigger workflow, cancel, rerun
export async function POST(request: NextRequest) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const userId = request.headers.get('x-user-id');

  try {
    const body = await request.json();
    const { action, repo, workflow_id, ref, inputs, run_id } = body;

    if (!repo) {
      return NextResponse.json({ error: 'Repository is required' }, { status: 400 });
    }

    const [owner, repoName] = repo.split('/');

    // Trigger workflow dispatch
    if (action === 'trigger' && workflow_id) {
      const success = await triggerWorkflow(
        userId!,
        owner,
        repoName,
        parseInt(workflow_id),
        ref || 'main',
        inputs
      );

      if (!success) {
        return NextResponse.json({ error: 'Failed to trigger workflow' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Workflow triggered successfully',
      });
    }

    // Cancel workflow run
    if (action === 'cancel' && run_id) {
      const success = await cancelWorkflowRun(userId!, owner, repoName, parseInt(run_id));

      if (!success) {
        return NextResponse.json({ error: 'Failed to cancel workflow' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Workflow cancelled',
      });
    }

    // Rerun workflow
    if (action === 'rerun' && run_id) {
      const success = await rerunWorkflow(userId!, owner, repoName, parseInt(run_id));

      if (!success) {
        return NextResponse.json({ error: 'Failed to rerun workflow' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Workflow rerun initiated',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Actions POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
