import React from 'react';
import { useDeliverySellerStore } from '../store/store';
import { formatDateTime, formatPriceInt, formatOrderStatus } from '../utils/formatters';
import { useToast } from './ui';
import type { OrderDetailProps } from './index';

export const OrderDetail: React.FC<OrderDetailProps> = ({ orderId, onBack }) => {
  const { orders, acceptOrder, startPreparingOrder, completePreparation, cancelOrder, completeOrder, rejectOrder } = useDeliverySellerStore();
  const { success, warning } = useToast();

  const order = orders.find((o) => o.id === orderId);

  if (!order) {
    return (
      <div className="order-detail">
        <div className="empty-state">
          <p>订单不存在</p>
          <button className="btn btn-primary" onClick={onBack}>
            返回列表
          </button>
        </div>
      </div>
    );
  }

  const handleCancel = () => {
    const reason = prompt('请输入取消原因：');
    if (reason) {
      cancelOrder(orderId, reason);
      success('订单已取消');
      onBack?.();
    }
  };

  const handleReject = () => {
    const reason = prompt('请输入拒单原因：');
    if (reason) {
      rejectOrder(orderId, reason);
      warning('已拒单');
      onBack?.();
    }
  };

  const handleComplete = () => {
    completeOrder(orderId);
    success('订单已完成');
    onBack?.();
  };

  // 打印小票（模拟）
  const handlePrint = () => {
    const printContent = `
      <html>
        <head><title>订单小票 - ${order.id}</title></head>
        <body style="font-family: monospace; padding: 20px;">
          <h2 style="text-align: center;">${order.merchantName}</h2>
          <p style="text-align: center;">订单号：${order.id}</p>
          <p>下单时间：${formatDateTime(order.createdAt)}</p>
          <hr/>
          ${order.lines.map(line => `
            <div>
              ${line.dishName} x${line.qty} - ¥${(line.unitPrice * line.qty).toFixed(2)}
              ${line.note ? `<br/><small>备注：${line.note}</small>` : ''}
            </div>
          `).join('')}
          <hr/>
          <p>商品总额：¥${order.itemTotal.toFixed(2)}</p>
          <p>打包费：¥${order.packageFee.toFixed(2)}</p>
          <p>配送费：¥${order.deliveryFee.toFixed(2)}</p>
          ${order.discountFee > 0 ? `<p>优惠：-¥${order.discountFee.toFixed(2)}</p>` : ''}
          <p style="font-weight: bold; font-size: 18px;">实付：¥${order.payableAmount.toFixed(2)}</p>
          <hr/>
          <p>顾客：${order.address.name} ${order.address.phone}</p>
          <p>地址：${order.address.detail}</p>
          <p style="text-align: center; margin-top: 20px;">感谢光临！</p>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
    success('正在打印小票...');
  };

  return (
    <div className="order-detail">
      <div className="detail-header">
        <button className="btn-icon back-btn" onClick={onBack}>
          ←
        </button>
        <h2 className="page-title">订单详情</h2>
      </div>

      <div className="detail-content">
        {/* 订单状态 */}
        <div className={`status-card ${order.status}`}>
          <span className="status-badge">{formatOrderStatus(order.status)}</span>
          <span className="status-time">{formatDateTime(order.createdAt)}</span>
        </div>

        {/* 订单信息 */}
        <section className="section">
          <h3 className="section-title">订单信息</h3>
          <div className="info-row">
            <span className="info-label">订单号</span>
            <span className="info-value">{order.id}</span>
          </div>
          <div className="info-row">
            <span className="info-label">下单时间</span>
            <span className="info-value">{formatDateTime(order.createdAt)}</span>
          </div>
          {order.paidAt && (
            <div className="info-row">
              <span className="info-label">支付时间</span>
              <span className="info-value">{formatDateTime(order.paidAt)}</span>
            </div>
          )}
          {order.finishedAt && (
            <div className="info-row">
              <span className="info-label">完成时间</span>
              <span className="info-value">{formatDateTime(order.finishedAt)}</span>
            </div>
          )}
          <div className="info-row">
            <span className="info-label">配送方式</span>
            <span className="info-value">
              {order.deliveryTimeMode === 'instant' ? '立即配送' : '预约配送'}
            </span>
          </div>
          {order.scheduleAt && (
            <div className="info-row">
              <span className="info-label">预约时间</span>
              <span className="info-value">{formatDateTime(order.scheduleAt)}</span>
            </div>
          )}
          {order.estimatedDeliveredAt && (
            <div className="info-row">
              <span className="info-label">预计送达</span>
              <span className="info-value">{formatDateTime(order.estimatedDeliveredAt)}</span>
            </div>
          )}
        </section>

        {/* 商品信息 */}
        <section className="section">
          <h3 className="section-title">商品信息</h3>
          <div className="order-lines">
            {order.lines.map((line) => (
              <div key={line.id} className="order-line-item">
                <div className="line-header">
                  <span className="line-qty">x{line.qty}</span>
                  <span className="line-name">{line.dishName}</span>
                </div>
                {line.selectedOptions.length > 0 && (
                  <div className="line-options">
                    {line.selectedOptions.map((opt) => (
                      <span key={opt.optionId} className="option-tag">
                        {opt.optionName}
                        {opt.priceDelta !== 0 && ` (+¥${opt.priceDelta})`}
                      </span>
                    ))}
                  </div>
                )}
                {line.note && (
                  <div className="line-note">
                    <span className="note-label">备注：</span>
                    <span>{line.note}</span>
                  </div>
                )}
                <div className="line-price">
                  ¥{(line.unitPrice * line.qty + line.selectedOptions.reduce((sum, opt) => sum + opt.priceDelta * line.qty, 0)).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 配送信息 */}
        <section className="section">
          <h3 className="section-title">配送信息</h3>
          <div className="address-card">
            <div className="address-row">
              <span className="address-name">{order.address.name}</span>
              <span className="address-phone">{order.address.phone}</span>
            </div>
            <div className="address-detail">{order.address.detail}</div>
          </div>
        </section>

        {/* 费用明细 */}
        <section className="section">
          <h3 className="section-title">费用明细</h3>
          <div className="price-row">
            <span>商品总额</span>
            <span>{formatPriceInt(order.itemTotal)}</span>
          </div>
          <div className="price-row">
            <span>打包费</span>
            <span>{formatPriceInt(order.packageFee)}</span>
          </div>
          <div className="price-row">
            <span>配送费</span>
            <span>{formatPriceInt(order.deliveryFee)}</span>
          </div>
          {order.discountFee > 0 && (
            <div className="price-row discount">
              <span>优惠</span>
              <span>-{formatPriceInt(order.discountFee)}</span>
            </div>
          )}
          <div className="price-row total">
            <span>实付金额</span>
            <span>{formatPriceInt(order.payableAmount)}</span>
          </div>
        </section>

        {/* 订单时间线 */}
        <section className="section">
          <h3 className="section-title">订单时间线</h3>
          <div className="timeline">
            {order.timeline.map((item) => (
              <div key={item.id} className="timeline-item">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <div className="timeline-label">{item.label}</div>
                  <div className="timeline-time">{formatDateTime(item.at)}</div>
                  {item.note && <div className="timeline-note">{item.note}</div>}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 操作按钮 */}
        <div className="detail-actions">
          {order.status === 'paid' && (
            <button className="btn btn-primary" onClick={() => { acceptOrder(orderId); success('已接单'); }}>
              接单
            </button>
          )}
          {order.status === 'accepted' && (
            <button className="btn btn-primary" onClick={() => { startPreparingOrder(orderId); success('开始制作'); }}>
              开始制作
            </button>
          )}
          {order.status === 'preparing' && (
            <button className="btn btn-primary" onClick={() => { completePreparation(orderId); success('已出餐'); }}>
              出餐
            </button>
          )}
          {order.status === 'delivering' && (
            <button className="btn btn-success" onClick={handleComplete}>
              完成订单
            </button>
          )}
          {['paid', 'accepted', 'preparing'].includes(order.status) && (
            <>
              <button className="btn btn-danger" onClick={handleReject}>
                拒单
              </button>
              <button className="btn btn-warning" onClick={handleCancel}>
                取消订单
              </button>
            </>
          )}
          <button className="btn btn-secondary" onClick={handlePrint}>
            🖨️ 打印小票
          </button>
          <button className="btn btn-secondary" onClick={onBack}>
            返回列表
          </button>
        </div>
      </div>
    </div>
  );
};
