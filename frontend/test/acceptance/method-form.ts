import { chooseMethod, ensureProcessing } from './workspace-navigation';
import { expect,type Page } from '@playwright/test';
import type { Cell } from '@dashboard/data-core';
export interface MethodFixture {method:string;csv:string;parameters:Record<string,unknown>;column?:number}
async function cell(page:Page,label:string,value:Cell){
  await page.getByLabel(`${label} · kiểu`,{exact:true}).selectOption(value.kind);
  if(value.kind==='null')return;
  if(value.kind==='boolean')await page.getByLabel(`${label} · nội dung`,{exact:true}).selectOption(String(value.value));
  else await page.getByLabel(`${label} · nội dung`,{exact:true}).fill(String(value.value));
}
/** Exercise the real typed controls for every method; no JSON shortcut. */
export async function configureMethod(page:Page,item:MethodFixture){
  await chooseMethod(page,item.method);
  if(item.method==='edit_cell')await page.getByRole('button',{name:'Dòng 1, cột n',exact:true}).click();
  else if(item.method!=='remove_duplicates'){await ensureProcessing(page);await page.getByLabel('Các cột xử lý',{exact:true}).selectOption({label:item.column===1?'t':'n'});}
  for(const [key,value]of Object.entries(item.parameters)){
    if(['value','from','to'].includes(key))await cell(page,key==='from'?'Giá trị cần tìm':key==='to'?'Giá trị thay thế':'Giá trị mới',value as Cell);
    if(key==='minDf'||key==='maxFeatures')await page.getByLabel(key==='minDf'?'Số văn bản tối thiểu chứa token':'Số token tối đa',{exact:true}).fill(String(value));
    if(key==='norm')await page.getByLabel('Chuẩn hóa vector',{exact:true}).selectOption(String(value));
    if(key==='mode')await page.getByLabel('Chế độ khoảng trắng',{exact:true}).selectOption(String(value));
    if(key==='decimalSeparator')await page.getByLabel('Dấu thập phân',{exact:true}).selectOption(String(value));
    if(key==='timezone')await page.getByLabel('Múi giờ IANA',{exact:true}).fill(String(value));
    if(key==='trueValues'||key==='falseValues')await page.getByLabel(key==='trueValues'?'Các giá trị true':'Các giá trị false',{exact:true}).fill((value as string[]).join('\n'));
    if(key==='condition')await page.getByLabel('Điều kiện thiếu',{exact:true}).selectOption(String(value));
    const numberLabels:Record<string,string>={factor:'Hệ số IQR (>0)',threshold:'Ngưỡng z-score (>0)',rangeMin:'Giá trị nhỏ nhất',rangeMax:'Giá trị lớn nhất'};
    if(key in numberLabels)await page.getByLabel(numberLabels[key],{exact:true}).fill(String(value));
    const booleanLabels:Record<string,string>={decodeEntities:'Giải mã HTML entities',allowThousands:'Cho phép phân nhóm hàng nghìn hợp lệ',caseSensitive:'Phân biệt hoa/thường',keepSource:item.method==='tfidf'?'Giữ cột văn bản nguồn':'Giữ cột nguồn',lowercase:'Chuyển token thành chữ thường',sublinearTf:'TF theo log (1 + ln số lần)',missingCategory:'Tạo category missing riêng',asCategory:'Xem cột number như category'};
    if(key in booleanLabels)await page.getByLabel(booleanLabels[key],{exact:true}).setChecked(value as boolean);
    if(key==='mapping'){
      await page.getByRole('button',{name:'Tải category từ toàn cột',exact:true}).click();
      await expect(page.getByLabel('Nhãn 1',{exact:true})).toBeVisible();
      for(const [index,entry]of (value as {value:Cell;label:number}[]).entries())await page.getByLabel(`Nhãn ${index+1}`,{exact:true}).fill(String(entry.label));
    }
  }
}
