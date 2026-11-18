import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Dialog, Feedback, Field } from '../../src/shared/ui/controls';
import '../../src/index.css';

function Fixture() {
  const [open, setOpen] = useState(false);
  return <><a href="#content" className="skip-link">Đến nội dung</a><main className="workspace" id="content" tabIndex={-1}>
    <div className="page-heading"><div><p className="eyebrow">DESIGN SYSTEM / GIAI ĐOẠN 1</p><h1>Không gian phân tích dữ liệu</h1><p className="muted">Fixture UI độc lập · Không gọi API hoặc đọc dữ liệu tài khoản</p></div><span className="save-state">Đã lưu workspace</span></div>
    <nav className="section-tabs" aria-label="Các bước mẫu"><button data-step="collection" aria-current="page">01 Collection</button><button data-step="cleaning">02 Cleaning</button><button data-step="history" disabled>03 History</button></nav>
    <section><h2>Thành phần và trạng thái</h2><p className="muted">Màu sắc có nhãn; chọn trục, dữ liệu và nghiệp vụ không nằm trong fixture này.</p>
      <div className="stat-grid"><div><strong>12.480</strong><span>Dòng dữ liệu</span></div><div><strong>24</strong><span>Cột dữ liệu</span></div><div><strong>98,6%</strong><span>Giá trị hợp lệ</span></div></div>
      <div className="actions"><Button>Thao tác chính</Button><Button variant="secondary">Thao tác phụ</Button><Button variant="danger">Thao tác nguy hiểm</Button><Button disabled>Chưa khả dụng</Button><Button variant="secondary" onClick={() => setOpen(true)}>Mở hộp thoại mẫu</Button></div>
      <div className="form-grid"><Field label="Tên project mẫu" defaultValue="Phân tích khách hàng"/><Field label="Trường có lỗi" error="Kiểm tra lại giá trị" defaultValue="Ví dụ"/>
        <label>Chọn trục mẫu<select defaultValue="x"><option value="x">Doanh thu</option><option value="y">Số lượng</option></select></label><Field label="Trường bị khóa" disabled defaultValue="Giữ nguyên dữ liệu"/>
      </div>
      <label className="check"><input type="checkbox" defaultChecked/>Hiển thị chú giải</label>
      <label>Ghi chú<textarea defaultValue="Giao diện là lớp trình bày; không thay đổi dữ liệu gốc."/></label>
      <Feedback>Đã chuẩn bị không gian phân tích.</Feedback><Feedback error>Ví dụ thông báo lỗi có thể đọc bằng trình đọc màn hình.</Feedback>
    </section>
    <div className="project-grid"><article className="project-card"><span className="badge ready">Có dữ liệu</span><h2>Phân tích khách hàng</h2><p className="muted">Surface, border và shadow dùng chung token.</p><Button variant="secondary">Mở workspace mẫu</Button></article><article className="project-card"><span className="badge">Local</span><h2>Giữ nguyên workspace</h2><p className="muted">Không đổi router, API, IndexedDB hoặc đồng bộ.</p></article></div>
    <section><h2>Bảng và lựa chọn</h2><div className="data-table"><table><thead><tr><th>Cột</th><th>Giá trị</th><th>Trạng thái</th></tr></thead><tbody><tr><th scope="row">Doanh thu</th><td className="selected"><button className="cell-button" aria-label="Ô doanh thu" aria-pressed="true">125.000</button></td><td><span className="badge ready">Hợp lệ</span></td></tr><tr><th scope="row">Ghi chú</th><td><span className="cell-missing">Chuỗi rỗng</span></td><td className="muted">Giữ token missing</td></tr></tbody></table></div></section>
    {open && <Dialog title="Hộp thoại mẫu" onClose={() => setOpen(false)}><Field label="Tên trong hộp thoại" defaultValue="Đổi giao diện"/><Button onClick={() => setOpen(false)}>Xác nhận mẫu</Button></Dialog>}
  </main></>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
