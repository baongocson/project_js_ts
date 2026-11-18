import type { ScatterColors } from '../scatter-colors';

export function ScatterLegend({ colors }: { colors: ScatterColors }) {
  const { palette, range, axis, mode } = colors;
  return <div className="scatter-legend" aria-label="Chú giải màu điểm">
    {axis !== 'none' ? <div className="numeric-legend"><strong>Giá trị {axis.toUpperCase()} · {colors.rangeScope}</strong>
      <span className="numeric-ramp" style={{ background: `linear-gradient(90deg,${palette.low},${palette.mid},${palette.high})` }}/>
      <span>{range ? `${range[0].toLocaleString('vi-VN')} → ${range[1].toLocaleString('vi-VN')}` : 'Không có miền số hợp lệ'}</span>
    </div> : <><span><i style={{ background: palette.normal }}/>Điểm dữ liệu</span>
      {mode === 'missing' && <span><i style={{ background: palette.missing }}/>Vàng: dòng có missing</span>}
      {mode === 'outlier' && <span><i style={{ background: palette.outlier }}/>Đỏ: dòng có outlier</span>}</>}
    <span><i className="selected-swatch" style={{ background: palette.selected }}/>Dòng đang chọn · kích thước lớn / viền</span>
  </div>;
}
