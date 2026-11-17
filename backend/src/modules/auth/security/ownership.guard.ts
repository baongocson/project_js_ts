import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OwnershipService } from './ownership.service';
import { PREVIEW_BODY, PUBLIC_ROUTE, type AuthRequest } from './auth-context';
import { resourceParams } from '../../../common/validation/request.validation';

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly ownership: OwnershipService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const principal = request.principal;
    if (!principal) throw new Error('AuthGuard must execute first');
    const params = request.params;
    resourceParams(Object.keys(params))(params);
    // Validate all resource ID syntax after authentication, before resource lookup.
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && ['projectId', 'datasetId', 'versionId', 'previewId'].includes(key)) this.ownership.objectId(value);
    }
    const value = (key: string) => typeof params[key] === 'string' ? params[key] : undefined;
    const write = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    const projectId = value('projectId'), datasetId = value('datasetId'), versionId = value('versionId'), previewId = value('previewId');
    if (projectId) await this.ownership.project(projectId, principal, write);
    if (datasetId) await this.ownership.dataset(datasetId, principal, write);
    if (datasetId && versionId) await this.ownership.version(datasetId, versionId);
    if (datasetId && previewId) await this.ownership.preview(datasetId, previewId);
    if (datasetId && this.reflector.get<boolean>(PREVIEW_BODY, context.getHandler())) {
      const body: unknown = request.body;
      if (typeof body === 'object' && body !== null && 'previewId' in body && typeof body.previewId === 'string') {
        await this.ownership.preview(datasetId, body.previewId);
      }
    }
    return true;
  }
}
