import { test,expect,type Page } from '@playwright/test';
const csv='x,y,z,constant,label,empty\n'+Array.from({length:120},(_,i)=>`${i===119?'':i+1},${(i+1)*2},${(i+1)*3},5,${i%2?'b':'a'},`).join('\n')+'\n';
async function online(page:Page,name:string,source=csv){
  const email=`analysis-${crypto.randomUUID()}@example.com`,password='analysis-password-123';
  await page.goto('/register');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Mật khẩu',{exact:true}).fill(password);await page.getByLabel('Nhập lại mật khẩu',{exact:true}).fill(password);await page.getByRole('button',{name:'Đăng ký',exact:true}).click();await expect(page.getByRole('status')).toContainText('Tạo tài khoản thành công');
  await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Mật khẩu',{exact:true}).fill(password);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await expect(page).toHaveURL(/\/projects$/);
  await page.getByLabel('Tên project mới',{exact:true}).fill(name);await page.getByRole('button',{name:'Tạo project',exact:true}).click();await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
  await page.getByLabel('File CSV online',{exact:true}).setInputFiles({name:'analysis.csv',mimeType:'text/csv',buffer:Buffer.from(source)});await page.getByRole('button',{name:'Import lên server',exact:true}).click();await expect(page.getByTestId('analysis-summary')).toContainText('Dòng toàn dataset');
}
async function axes(page:Page){for(const [axis,label]of [['X','x'],['Y','y'],['Z','z']])await page.getByLabel(`Trục ${axis}`,{exact:true}).selectOption({label});}
test('Collection shows selectable boxplot and EDA charts, and colors global flags outside axis columns',async({page})=>{
  await online(page,'EDA and global colors','x,y,z,other,label\n1,2,3,1,a\n2,3,4,1,a\n3,4,5,1,\n4,5,6,1,b\n5,6,7,1,b\n6,7,8,100,c\n,8,9,1,d\n');
  await expect(page.getByRole('img',{name:'Boxplot x',exact:true})).toBeVisible();
  await page.getByLabel('Cột boxplot',{exact:true}).selectOption({label:'other'});
  await expect(page.getByTestId('boxplot-panel')).toContainText('1 outlier');await expect(page.getByRole('img',{name:'Boxplot other',exact:true})).toBeVisible();
  await expect(page.getByRole('img',{name:'Histogram phân phối toàn cột',exact:true})).toBeVisible();
  await page.getByLabel('Cột phân phối',{exact:true}).selectOption({label:'label'});await expect(page.getByRole('img',{name:'Biểu đồ tần suất giá trị',exact:true})).toBeVisible();
  await page.screenshot({path:test.info().outputPath('eda-collection-desktop.png'),fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:test.info().outputPath('eda-collection-mobile.png'),fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.setViewportSize({width:1280,height:720});
  await page.getByRole('button',{name:'Không gian 3D',exact:true}).click();await axes(page);await page.getByRole('button',{name:'Dùng hình chiếu tương thích',exact:true}).click();
  await page.getByLabel('Màu điểm',{exact:true}).selectOption('outlier');await expect(page.getByTestId('global-point-flags')).toContainText('1 dòng outlier');await expect(page.locator('circle[data-point][fill="#b73350"]')).toHaveCount(1);
  await page.getByLabel('Màu điểm',{exact:true}).selectOption('missing');await expect(page.getByTestId('global-point-flags')).toContainText('2 dòng missing');await expect(page.locator('circle[data-point][fill="#b57520"]')).toHaveCount(1);await expect(page.getByRole('button',{name:/Điểm không đủ tọa độ/})).toHaveCount(1);
  await page.getByRole('button',{name:/Điểm không đủ tọa độ/}).click();await expect(page.getByTestId('analysis-selected-row')).toContainText('Dòng 7');await page.getByLabel('Kiểu ô x',{exact:true}).selectOption('number');await page.getByLabel('Sửa ô x',{exact:true}).fill('7');await page.getByRole('button',{name:'Lưu ô x',exact:true}).click();await expect(page.getByRole('button',{name:'Dòng 7, cột x',exact:true})).toHaveText('7');
});
test('five online analysis APIs cover all rows, preserve N/A, sampling and point-to-row lookup beyond table filters',async({page})=>{
  await online(page,'Analysis contract');
  const region=page.getByRole('region',{name:'Phân tích dữ liệu',exact:true});
  await expect(page.getByTestId('analysis-summary')).toContainText('120Dòng toàn dataset');
  await expect(page.getByTestId('analysis-summary')).toContainText('121Ô thiếu');
  await page.getByLabel('Các cột kiểm outlier',{exact:true}).selectOption([{label:'x (number)'},{label:'label (text)'}]);
  await expect(page.getByTestId('analysis-summary')).toContainText('label: N/A — cột không phải number');
  await page.getByRole('button',{name:'Phân phối và tần suất',exact:true}).click();
  await expect(page.getByRole('img',{name:'Histogram phân phối toàn cột'})).toBeVisible();
  await page.getByLabel('Cột phân phối',{exact:true}).selectOption({label:'constant'});await expect(page.getByTestId('analysis-distribution')).toContainText('N/A — cột hằng');
  await page.getByLabel('Cột phân phối',{exact:true}).selectOption({label:'empty'});await expect(page.getByTestId('analysis-distribution')).toContainText('Missing: 120');
  await page.getByLabel('Cột phân phối',{exact:true}).selectOption({label:'label'});await expect(page.getByTestId('analysis-distribution')).toContainText('2 category · 120 dòng');await expect(page.getByTestId('analysis-distribution')).toContainText('50%');
  await page.getByRole('button',{name:'Tương quan Pearson',exact:true}).click();
  await expect(page.getByTestId('analysis-correlation')).toContainText('6 feature');await expect(page.getByTestId('analysis-correlation')).toContainText('119 cặp');await expect(page.getByTestId('analysis-correlation')).toContainText('N/A — cột hằng');await expect(page.getByTestId('analysis-correlation')).toContainText('N/A — cột không phải number');
  await page.getByLabel('Cột filter',{exact:true}).selectOption({label:'x'});await page.getByLabel('Điều kiện filter',{exact:true}).selectOption('gt');await page.getByLabel('Giá trị filter',{exact:true}).fill('100');await page.getByRole('button',{name:'Lọc',exact:true}).click();await expect(page.getByRole('button',{name:'Dòng 1, cột x',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Không gian 3D',exact:true}).click();await axes(page);
  await expect(page.getByTestId('points-counts')).toHaveText('119/119 điểm hợp lệ · Ẩn thiếu tọa độ: 1 · Ẩn tọa độ không hợp lệ: 0');
  await page.getByRole('button',{name:'Dùng hình chiếu tương thích',exact:true}).click();
  const first=page.locator('circle[data-point]').first();const id=await first.getAttribute('data-point');
  const rowResponse=page.waitForResponse(response=>response.url().endsWith(`/rows/${id}`));
  await first.focus();await page.keyboard.press('Enter');expect((await rowResponse).status()).toBe(200);
  await expect(page.getByTestId('analysis-selected-row')).toContainText('Dòng 1');await expect(page.getByTestId('analysis-selected-row')).toContainText('độc lập filter');
  await page.getByLabel('Màu điểm',{exact:true}).selectOption('missing');await expect(region).toContainText('Vàng: dòng có missing');
  await page.getByLabel('Tối đa điểm hiển thị',{exact:true}).selectOption('100');await expect(page.getByTestId('points-counts')).toContainText('100/119');await expect(region).toContainText('19 điểm hợp lệ không được vẽ');
  await page.getByLabel('Màu điểm',{exact:true}).selectOption('outlier');await expect(region).toContainText('Đỏ: dòng có outlier');
  await page.getByRole('button',{name:'Xoay phải',exact:true}).click();await page.getByRole('button',{name:'Đặt lại góc nhìn',exact:true}).click();
  await page.screenshot({path:test.info().outputPath('analysis-3d-desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:test.info().outputPath('analysis-3d-mobile.png'),fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await expect(page.getByRole('status')).toContainText('Đã lưu');
  await page.reload();await page.getByRole('button',{name:'Không gian 3D',exact:true}).click();await expect(page.getByLabel('Màu điểm',{exact:true})).toHaveValue('outlier');
});
test('offline analysis uses the entire stored snapshot and works after offline reload with the same counts and N/A semantics',async({page,context})=>{
  await page.goto('/offline');await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);await context.setOffline(true);
  await page.getByLabel('Tên project',{exact:true}).fill('Offline analysis');await page.getByLabel('File CSV',{exact:true}).setInputFiles({name:'analysis.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});await page.getByRole('button',{name:'Lưu offline',exact:true}).click();await expect(page.getByTestId('analysis-summary')).toContainText('120Dòng toàn dataset');
  await page.reload();await expect(page.getByTestId('analysis-summary')).toContainText('121Ô thiếu');
  await page.getByRole('button',{name:'Phân phối và tần suất',exact:true}).click();await page.getByLabel('Cột phân phối',{exact:true}).selectOption({label:'label'});await expect(page.getByTestId('analysis-distribution')).toContainText('2 category · 120 dòng');
  await page.getByRole('button',{name:'Tương quan Pearson',exact:true}).click();await expect(page.getByTestId('analysis-correlation')).toContainText('119 cặp');await expect(page.getByTestId('analysis-correlation')).toContainText('N/A — cột hằng');
  await page.getByRole('button',{name:'Không gian 3D',exact:true}).click();await axes(page);await expect(page.getByTestId('points-counts')).toContainText('119/119');
  await page.getByRole('button',{name:'Dùng hình chiếu tương thích',exact:true}).click();await page.locator('circle[data-point]').last().click();await expect(page.getByTestId('analysis-selected-row')).toContainText('Dòng 119');await expect(page.getByTestId('analysis-selected-row')).toContainText('Chuỗi rỗng');
  await page.getByLabel('Tối đa điểm hiển thị',{exact:true}).selectOption('100');await expect(page.getByTestId('points-counts')).toContainText('100/119');
});
test('header-only and all-missing datasets expose empty and N/A states and analysis HTTP errors can be retried',async({page})=>{
  await online(page,'Empty analysis','x,y,z\n');await expect(page.getByTestId('analysis-summary')).toContainText('0Dòng toàn dataset');await expect(page.getByTestId('analysis-summary')).toContainText('N/A');
  await page.route('**/analysis/correlation?*',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{code:'UNAVAILABLE',message:'Temporary analysis failure'}})}));
  await page.getByRole('button',{name:'Tương quan Pearson',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Temporary analysis failure');await page.unroute('**/analysis/correlation?*');await page.getByRole('button',{name:'Thử lại phân tích',exact:true}).click();await expect(page.getByTestId('analysis-correlation')).toContainText('N/A');
  await page.getByRole('button',{name:'Không gian 3D',exact:true}).click();await expect(page.getByTestId('analysis-points')).toContainText('Chưa có cột number');
});
