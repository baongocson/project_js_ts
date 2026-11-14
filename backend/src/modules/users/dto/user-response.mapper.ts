import type { PublicUserDto,UserPreferencesDto,RegisterResponseDto,LoginResponseDto,PatchUserResponseDto } from './user.dto';
function iso(value:Date|string):string {const date=value instanceof Date?value:new Date(value);return date.toISOString();}
export interface UserResponseSource {_id:{toString():string}|string;email:string;displayName?:string|null;preferences?:UserPreferencesDto;createdAt:Date|string;updatedAt:Date|string}
export function publicUser(source:UserResponseSource):PublicUserDto {
 return {_id:source._id.toString(),email:source.email,displayName:source.displayName??null,preferences:{theme:source.preferences?.theme??'system'},createdAt:iso(source.createdAt),updatedAt:iso(source.updatedAt)};
}
export function registerResponse(source:UserResponseSource):RegisterResponseDto {const {_id,email,displayName,preferences,createdAt}=publicUser(source);return {user:{_id,email,displayName,preferences,createdAt}};}
export function loginResponse(source:UserResponseSource,accessToken:string,expiresIn:number):LoginResponseDto {const {_id,email,displayName,preferences}=publicUser(source);return {accessToken,expiresIn,user:{_id,email,displayName,preferences}};}
export function patchUserResponse(source:UserResponseSource):PatchUserResponseDto {const {_id,displayName,preferences,updatedAt}=publicUser(source);return {_id,displayName,preferences,updatedAt};}
