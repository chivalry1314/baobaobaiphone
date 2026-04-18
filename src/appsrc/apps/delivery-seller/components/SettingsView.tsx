import React, { useState } from 'react';
import { useDeliverySellerStore } from '../store/store';
import { formatPriceInt } from '../utils/formatters';

export interface SettingsViewProps {
  onBack?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onBack }) => {
  const {
    shopConfig,
    updateShopStatus,
    deliveryFeeConfig,
    setDeliveryFeeConfig,
    printSettings,
    setPrintSettings,
    accountInfo,
    loadSettings,
    updatePassword,
    bindPhone,
  } = useDeliverySellerStore();

  const [activeSection, setActiveSection] = useState<string>('account');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showPhoneForm, setShowPhoneForm] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [verifyCode, setVerifyCode] = useState('');

  React.useEffect(() => {
    loadSettings();
  }, []);

  const handleUpdatePassword = async () => {
    const success = await updatePassword(oldPassword, newPassword);
    if (success) {
      alert('密码修改成功');
      setShowPasswordForm(false);
      setOldPassword('');
      setNewPassword('');
    } else {
      alert('密码修改失败');
    }
  };

  const handleBindPhone = async () => {
    const success = await bindPhone(phone, verifyCode);
    if (success) {
      alert('手机绑定成功');
      setShowPhoneForm(false);
      setPhone('');
      setVerifyCode('');
    } else {
      alert('手机绑定失败');
    }
  };

  const handleDeliveryFeeChange = (key: keyof typeof deliveryFeeConfig, value: number) => {
    setDeliveryFeeConfig({ ...deliveryFeeConfig, [key]: value });
  };

  const handlePrintSettingChange = (key: keyof typeof printSettings, value: any) => {
    setPrintSettings({ ...printSettings, [key]: value });
  };

  const APP_VERSION = '1.0.0';

  return (
    <div className="settings-view">
      <div className="detail-header">
        <button className="btn-icon back-btn" onClick={onBack}>
          ←
        </button>
        <h2 className="page-title">设置</h2>
      </div>

      {/* 设置分类 */}
      <div className="settings-nav">
        <button
          className={`nav-btn ${activeSection === 'account' ? 'active' : ''}`}
          onClick={() => setActiveSection('account')}
        >
          账户安全
        </button>
        <button
          className={`nav-btn ${activeSection === 'delivery' ? 'active' : ''}`}
          onClick={() => setActiveSection('delivery')}
        >
          配送设置
        </button>
        <button
          className={`nav-btn ${activeSection === 'print' ? 'active' : ''}`}
          onClick={() => setActiveSection('print')}
        >
          打印设置
        </button>
        <button
          className={`nav-btn ${activeSection === 'about' ? 'active' : ''}`}
          onClick={() => setActiveSection('about')}
        >
          关于我们
        </button>
      </div>

      {/* 账户安全 */}
      {activeSection === 'account' && (
        <div className="settings-content">
          <section className="settings-section">
            <h3 className="section-title">账户信息</h3>
            <div className="info-list">
              <div className="info-item">
                <span className="info-label">店铺名称</span>
                <span className="info-value">{shopConfig?.name || '-'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">商家 ID</span>
                <span className="info-value">{accountInfo?.merchantId || '-'}</span>
              </div>
            </div>
          </section>

          <section className="settings-section">
            <h3 className="section-title">安全设置</h3>
            <div className="setting-item clickable" onClick={() => setShowPasswordForm(true)}>
              <div className="setting-info">
                <span className="setting-label">修改密码</span>
              </div>
              <span className="setting-arrow">›</span>
            </div>

            <div className="setting-item clickable" onClick={() => setShowPhoneForm(true)}>
              <div className="setting-info">
                <span className="setting-label">绑定手机</span>
                <span className="setting-desc">
                  {accountInfo?.isPhoneBound ? '已绑定' : '未绑定'}
                </span>
              </div>
              <span className="setting-arrow">›</span>
            </div>
          </section>

          {/* 修改密码弹窗 */}
          {showPasswordForm && (
            <div className="modal-overlay" onClick={() => setShowPasswordForm(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>修改密码</h3>
                <div className="form-group">
                  <label className="form-label">原密码</label>
                  <input
                    type="password"
                    className="form-input"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="请输入原密码"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">新密码</label>
                  <input
                    type="password"
                    className="form-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="请输入新密码"
                  />
                </div>
                <div className="form-actions">
                  <button className="btn btn-secondary" onClick={() => setShowPasswordForm(false)}>
                    取消
                  </button>
                  <button className="btn btn-primary" onClick={handleUpdatePassword}>
                    确认修改
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 绑定手机弹窗 */}
          {showPhoneForm && (
            <div className="modal-overlay" onClick={() => setShowPhoneForm(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>绑定手机</h3>
                <div className="form-group">
                  <label className="form-label">手机号</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="请输入手机号"
                    maxLength={11}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">验证码</label>
                  <div className="verify-code-input">
                    <input
                      type="text"
                      className="form-input"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value)}
                      placeholder="请输入验证码"
                      maxLength={6}
                    />
                    <button className="btn btn-sm btn-send-code">
                      发送验证码
                    </button>
                  </div>
                </div>
                <div className="form-actions">
                  <button className="btn btn-secondary" onClick={() => setShowPhoneForm(false)}>
                    取消
                  </button>
                  <button className="btn btn-primary" onClick={handleBindPhone}>
                    确认绑定
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 配送设置 */}
      {activeSection === 'delivery' && (
        <div className="settings-content">
          <section className="settings-section">
            <h3 className="section-title">配送费配置</h3>
            <div className="form-group">
              <label className="form-label">基础配送费（元）</label>
              <input
                type="number"
                className="form-input"
                value={deliveryFeeConfig.baseFee}
                onChange={(e) => handleDeliveryFeeChange('baseFee', Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">每公里加价（元）</label>
              <input
                type="number"
                className="form-input"
                value={deliveryFeeConfig.distanceFeePerKm}
                onChange={(e) => handleDeliveryFeeChange('distanceFeePerKm', Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">起步距离（公里）</label>
              <input
                type="number"
                className="form-input"
                value={deliveryFeeConfig.minDistance}
                onChange={(e) => handleDeliveryFeeChange('minDistance', Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">免配送费门槛（元）</label>
              <input
                type="number"
                className="form-input"
                value={deliveryFeeConfig.freeDeliveryThreshold}
                onChange={(e) => handleDeliveryFeeChange('freeDeliveryThreshold', Number(e.target.value))}
              />
              <span className="form-hint">订单金额达到此值免配送费</span>
            </div>
          </section>
        </div>
      )}

      {/* 打印设置 */}
      {activeSection === 'print' && (
        <div className="settings-content">
          <section className="settings-section">
            <h3 className="section-title">打印配置</h3>
            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-label">自动打印</span>
                <span className="setting-desc">新订单自动打印小票</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={printSettings.autoPrint}
                  onChange={(e) => handlePrintSettingChange('autoPrint', e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">打印机</label>
              <select
                className="form-input"
                value={printSettings.printerId || ''}
                onChange={(e) => {
                  const printer = e.target.options[e.target.selectedIndex];
                  handlePrintSettingChange('printerId', e.target.value);
                  handlePrintSettingChange('printerName', printer.text);
                }}
              >
                <option value="">选择打印机</option>
                <option value="printer_1">蓝牙打印机 A</option>
                <option value="printer_2">WiFi 打印机 B</option>
                <option value="printer_3">USB 打印机 C</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">打印份数</label>
              <input
                type="number"
                className="form-input"
                value={printSettings.copies}
                onChange={(e) => handlePrintSettingChange('copies', Number(e.target.value))}
                min="1"
                max="5"
              />
            </div>
          </section>
        </div>
      )}

      {/* 关于我们 */}
      {activeSection === 'about' && (
        <div className="settings-content">
          <section className="settings-section">
            <div className="about-header">
              <div className="app-logo">📱</div>
              <h2 className="app-name">包包白外卖商家端</h2>
              <p className="app-version">版本 {APP_VERSION}</p>
            </div>
          </section>

          <section className="settings-section">
            <div className="info-list">
              <div className="info-item">
                <span className="info-label">当前版本</span>
                <span className="info-value">{APP_VERSION}</span>
              </div>
              <div className="info-item clickable">
                <span className="info-label">检查更新</span>
                <span className="info-value">已是最新版本 ›</span>
              </div>
              <div className="info-item clickable">
                <span className="info-label">帮助中心</span>
                <span className="info-value">›</span>
              </div>
              <div className="info-item clickable">
                <span className="info-label">联系客服</span>
                <span className="info-value">›</span>
              </div>
              <div className="info-item clickable">
                <span className="info-label">用户协议</span>
                <span className="info-value">›</span>
              </div>
              <div className="info-item clickable">
                <span className="info-label">隐私政策</span>
                <span className="info-value">›</span>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
