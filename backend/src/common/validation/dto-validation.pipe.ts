import type { PipeTransform } from '@nestjs/common';
export class DtoValidationPipe<T> implements PipeTransform<unknown,T> {
 constructor(private readonly parse:(input:unknown)=>T) {}
 transform(input:unknown):T{return this.parse(input);}
}
