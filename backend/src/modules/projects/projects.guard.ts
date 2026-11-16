import { CanActivate, ExecutionContext, Injectable, NotImplementedException } from '@nestjs/common';

/** Security scaffold: do not attach to routes until authorization is implemented. */
@Injectable()
export class ProjectsGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    throw new NotImplementedException({code:'NOT_IMPLEMENTED',message:'Guard chưa được triển khai',details:{module:'projects',action:'authorize'}});
  }
}
