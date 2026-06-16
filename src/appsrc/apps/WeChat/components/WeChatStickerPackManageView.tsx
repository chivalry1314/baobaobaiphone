import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Globe,
  Image as ImageIcon,
  Package,
  Plus,
  Smile,
  Trash2,
} from 'lucide-react';
import {
  addWeChatCustomStickers,
  addWeChatStickerPack,
  getStickersByPackId,
  readWeChatCustomStickers,
  readWeChatStickerPacks,
  removeWeChatCustomSticker,
  removeWeChatStickerPack,
  removeWeChatStickerPacksByThemeId,
  updateWeChatCustomSticker,
  updateWeChatStickerPack,
  type WeChatGifSticker,
  type WeChatStickerPack,
  WECHAT_CUSTOM_STICKERS_CHANGED_EVENT,
  WECHAT_STICKER_PACKS_CHANGED_EVENT,
} from '../emojiStickers';
import {
  getInstalledWechatThemes,
  removeInstalledWechatTheme,
  subscribeWechatThemeLibrary,
} from '../installedWechatThemeLibrary';
import type { WechatThemeDefinition } from '../onlineThemeTypes';
import { importImageFiles, importStickerZip } from './stickerPackImporter';

interface WeChatStickerPackManageViewProps {
  onBack: () => void;
}

type ManageMode = 'local' | 'online';

type ManageSubView =
  | { type: 'list' }
  | { type: 'detail'; packId: string }
  | { type: 'ungrouped' };

const PackCover: React.FC<{ url?: string | null; label?: string; className?: string }> = ({
  url,
  label,
  className = '',
}) => {
  if (url) {
    return (
      <img
        src={url}
        alt={label || '封面'}
        className={`h-full w-full object-cover ${className}`}
        loading="lazy"
      />
    );
  }
  return (
    <div className={`flex h-full w-full items-center justify-center bg-[#F1F5F9] text-[#94A3B8] ${className}`}>
      <Smile size={28} strokeWidth={1.5} />
    </div>
  );
};

const Toast: React.FC<{ message: string | null }> = ({ message }) => {
  if (!message) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-1/2 z-[300] flex justify-center px-6">
      <div className="rounded-xl bg-black/70 px-5 py-2.5 text-[14px] text-white shadow-lg">
        {message}
      </div>
    </div>
  );
};

export const WeChatStickerPackManageView: React.FC<WeChatStickerPackManageViewProps> = ({
  onBack,
}) => {
  const [mode, setMode] = useState<ManageMode>('local');
  const [subView, setSubView] = useState<ManageSubView>({ type: 'list' });
  const [packs, setPacks] = useState<WeChatStickerPack[]>(() => readWeChatStickerPacks());
  const [stickers, setStickers] = useState<WeChatGifSticker[]>(() => readWeChatCustomStickers());
  const [themes, setThemes] = useState<WechatThemeDefinition[]>(() => getInstalledWechatThemes());
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setPacks(readWeChatStickerPacks());
    setStickers(readWeChatCustomStickers());
    setThemes(getInstalledWechatThemes());
  }, []);

  useEffect(() => {
    const sync = () => refresh();
    window.addEventListener(WECHAT_CUSTOM_STICKERS_CHANGED_EVENT, sync);
    window.addEventListener(WECHAT_STICKER_PACKS_CHANGED_EVENT, sync);
    window.addEventListener('storage', sync);
    const unsubscribe = subscribeWechatThemeLibrary(sync);
    return () => {
      window.removeEventListener(WECHAT_CUSTOM_STICKERS_CHANGED_EVENT, sync);
      window.removeEventListener(WECHAT_STICKER_PACKS_CHANGED_EVENT, sync);
      window.removeEventListener('storage', sync);
      unsubscribe();
    };
  }, [refresh]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 1800);
  }, []);

  const localPacks = useMemo(() => packs.filter((item) => item.source !== 'online'), [packs]);
  const onlinePacks = useMemo(() => packs.filter((item) => item.source === 'online'), [packs]);

  const onlineGroups = useMemo(() => {
    const map = new Map<string, WeChatStickerPack[]>();
    onlinePacks.forEach((pack) => {
      const list = map.get(pack.themeId || '') || [];
      list.push(pack);
      map.set(pack.themeId || '', list);
    });
    return Array.from(map.entries()).map(([themeId, groupPacks]) => {
      const theme = themes.find((item) => item.id === themeId);
      const count = groupPacks.reduce(
        (sum, pack) => sum + getStickersByPackId(pack.id, stickers).length,
        0
      );
      return {
        themeId,
        themeName: theme?.name || '已卸载主题',
        packs: groupPacks,
        count,
      };
    });
  }, [onlinePacks, themes, stickers]);

  const handleCreatePack = useCallback(() => {
    const name = window.prompt('给新表情包起个名字', '新建表情包')?.trim();
    if (!name) return;
    try {
      const pack = addWeChatStickerPack(name);
      refresh();
      setSubView({ type: 'detail', packId: pack.id });
      showToast('表情包创建成功');
    } catch (error) {
      console.error('创建表情包失败:', error);
      showToast(error instanceof Error ? error.message : '创建失败');
    }
  }, [refresh, showToast]);

  const handleDeletePack = useCallback(
    async (id: string) => {
      const pack = packs.find((p) => p.id === id);
      if (!window.confirm(`确定删除表情包「${pack?.name || ''}」及其中的所有表情？`)) return;
      try {
        await removeWeChatStickerPack(id);
        refresh();
        if (subView.type === 'detail' && subView.packId === id) {
          setSubView({ type: 'list' });
        }
        showToast('表情包已删除');
      } catch (error) {
        console.error('删除表情包失败:', error);
        showToast(error instanceof Error ? error.message : '删除失败');
      }
    },
    [packs, refresh, showToast, subView]
  );

  const handleRenamePack = useCallback(
    (id: string) => {
      const pack = packs.find((p) => p.id === id);
      const name = window.prompt('修改表情包名称', pack?.name)?.trim();
      if (!name) return;
      try {
        updateWeChatStickerPack(id, { name });
        refresh();
        showToast('名称已修改');
      } catch (error) {
        console.error('重命名失败:', error);
        showToast(error instanceof Error ? error.message : '重命名失败');
      }
    },
    [packs, refresh, showToast]
  );

  const handleTogglePackEnabled = useCallback(
    (id: string) => {
      const pack = packs.find((p) => p.id === id);
      if (!pack) return;
      try {
        updateWeChatStickerPack(id, { enabled: pack.enabled === false });
        refresh();
        showToast(pack.enabled === false ? '表情包已启用' : '表情包已禁用');
      } catch (error) {
        console.error('切换表情包状态失败:', error);
        showToast(error instanceof Error ? error.message : '操作失败');
      }
    },
    [packs, refresh, showToast]
  );

  const handleRemoveOnlineThemeStickers = useCallback(
    async (themeId: string) => {
      const theme = themes.find((item) => item.id === themeId);
      if (!window.confirm(`确定移除在线主题「${theme?.name || ''}」挂载的表情包？主题本身不会被卸载。`)) return;
      try {
        await removeWeChatStickerPacksByThemeId(themeId);
        refresh();
        if (subView.type === 'detail' && onlinePacks.some((pack) => pack.id === subView.packId)) {
          setSubView({ type: 'list' });
        }
        showToast('表情包已移除');
      } catch (error) {
        console.error('移除在线主题表情包失败:', error);
        showToast(error instanceof Error ? error.message : '移除失败');
      }
    },
    [themes, refresh, showToast, subView, onlinePacks]
  );

  const handleImageImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>, packId?: string) => {
      const rawFiles = event.target.files;
      const files = rawFiles ? Array.from(rawFiles) : [];
      event.target.value = '';
      console.log('[表情包导入] 选择文件:', files.length, files[0]?.name, files[0]?.type, files[0]?.size);
      if (files.length === 0) {
        showToast('未选择到文件');
        return;
      }
      try {
        const oversized = files.filter((file) => file.size > 5 * 1024 * 1024);
        if (oversized.length > 0) {
          showToast(`有 ${oversized.length} 张图片超过 5MB，可能导入失败`);
        }
        const candidates = await importImageFiles(files);
        console.log('[表情包导入] 解析结果:', candidates.length);
        if (!candidates.length) {
          showToast('未找到可导入的图片（仅支持 png/jpg/gif/webp/bmp）');
          return;
        }
        await addWeChatCustomStickers(candidates.map((item) => ({ ...item, packId })));
        refresh();
        showToast(`成功导入 ${candidates.length} 个表情`);
      } catch (error) {
        console.error('[表情包导入] 导入图片失败:', error);
        showToast(error instanceof Error ? error.message : '导入失败');
      }
    },
    [refresh, showToast]
  );

  const handleZipImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>, packId?: string) => {
      const rawFiles = event.target.files;
      const file = rawFiles?.[0];
      event.target.value = '';
      if (!file) {
        showToast('未选择到 zip 文件');
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        showToast('zip 包不能超过 20MB');
        return;
      }
      try {
        console.log('[表情包导入] 选择 zip:', file.name, file.size, file.type);
        const result = await importStickerZip(file);
        console.log('[表情包导入] zip 解析结果:', result.stickers.length);
        if (!result.stickers.length) {
          showToast('压缩包内未找到图片（仅支持 png/jpg/gif/webp/bmp）');
          return;
        }

        if (!packId) {
          const pack = addWeChatStickerPack(result.packName);
          await addWeChatCustomStickers(result.stickers.map((item) => ({ ...item, packId: pack.id })));
          refresh();
          setSubView({ type: 'detail', packId: pack.id });
          showToast(`成功导入 ${result.stickers.length} 个表情`);
          return;
        }

        await addWeChatCustomStickers(result.stickers.map((item) => ({ ...item, packId })));
        refresh();
        showToast(`成功导入 ${result.stickers.length} 个表情`);
      } catch (error) {
        console.error('导入 zip 失败:', error);
        showToast(error instanceof Error ? error.message : '导入失败');
      }
    },
    [refresh, showToast]
  );

  const handleDeleteSticker = useCallback(
    async (id: string) => {
      if (!window.confirm('确定删除这个表情？')) return;
      try {
        await removeWeChatCustomSticker(id);
        refresh();
        showToast('表情已删除');
      } catch (error) {
        console.error('删除表情失败:', error);
        showToast(error instanceof Error ? error.message : '删除失败');
      }
    },
    [refresh, showToast]
  );

  const handleRenameSticker = useCallback(
    (sticker: WeChatGifSticker) => {
      const name = window.prompt('修改表情名称', sticker.name)?.trim();
      if (!name) return;
      try {
        updateWeChatCustomSticker(sticker.id, { name });
        refresh();
        showToast('名称已修改');
      } catch (error) {
        console.error('重命名表情失败:', error);
        showToast(error instanceof Error ? error.message : '重命名失败');
      }
    },
    [refresh, showToast]
  );

  const packById = useMemo(() => {
    const map = new Map<string, WeChatStickerPack>();
    packs.forEach((pack) => map.set(pack.id, pack));
    return map;
  }, [packs]);

  const packCounts = useMemo(() => {
    const counts = new Map<string, number>();
    let ungrouped = 0;
    stickers.forEach((sticker) => {
      if (sticker.packId) {
        counts.set(sticker.packId, (counts.get(sticker.packId) || 0) + 1);
      } else {
        ungrouped += 1;
      }
    });
    return { counts, ungrouped };
  }, [stickers]);

  const getPackCover = useCallback(
    (packId: string) => {
      const pack = packById.get(packId);
      if (pack?.coverUrl) return pack.coverUrl;
      const first = stickers.find((s) => s.packId === packId);
      return first?.url || null;
    },
    [packById, stickers]
  );

  const renderModeTabs = () => (
    <div className="flex shrink-0 items-center justify-center gap-2 bg-[#F7F7F7] px-4 pb-3 pt-1">
      {([
        { key: 'local', label: '本地表情包' },
        { key: 'online', label: '在线主题表情' },
      ] as { key: ManageMode; label: string }[]).map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => {
            setMode(item.key);
            setSubView({ type: 'list' });
          }}
          className={`rounded-full px-4 py-1.5 text-[14px] transition-colors ${
            mode === item.key
              ? 'bg-[#07C160] text-white'
              : 'bg-white text-gray-600 active:bg-gray-100'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );

  const renderLocalListView = () => (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto [scrollbar-width:thin]">
      <div className="m-2 overflow-hidden rounded-xl bg-white">
        <button
          type="button"
          onClick={handleCreatePack}
          className="flex w-full items-center gap-3 px-4 py-3.5 active:bg-gray-50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F1F5F9] text-[#07C160]">
            <Plus size={22} strokeWidth={1.8} />
          </div>
          <span className="flex-1 text-left text-[16px] text-gray-900">新建表情包</span>
          <ChevronRight size={20} className="text-gray-300" />
        </button>
        <div className="mx-4 h-px bg-gray-100" />
        <label className="relative flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 active:bg-gray-50">
          <input
            type="file"
            accept=".zip"
            className="absolute inset-0 opacity-0"
            onChange={(event) => handleZipImport(event, undefined)}
          />
          <div className="pointer-events-none flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F1F5F9] text-[#4E83C5]">
            <Package size={20} strokeWidth={1.8} />
          </div>
          <div className="pointer-events-none flex-1 text-left">
            <div className="text-[16px] text-gray-900">导入 zip 表情包</div>
            <div className="text-[12px] text-gray-500">自动识别压缩包内的图片</div>
          </div>
          <ChevronRight size={20} className="pointer-events-none text-gray-300" />
        </label>
      </div>

      <div className="m-2 mb-2 text-[13px] text-gray-500">我的表情包</div>

      <div className="m-2 overflow-hidden rounded-xl bg-white">
        {localPacks.length === 0 ? (
          <div className="px-4 py-10 text-center text-[14px] text-gray-400">
            还没有表情包，点击上方新建或导入
          </div>
        ) : (
          localPacks.map((pack, index) => {
            const count = packCounts.counts.get(pack.id) || 0;
            return (
              <React.Fragment key={pack.id}>
                {index > 0 && <div className="mx-4 h-px bg-gray-100" />}
                <div className="flex items-center gap-3 px-4 py-3 active:bg-gray-50">
                  <button
                    type="button"
                    onClick={() => setSubView({ type: 'detail', packId: pack.id })}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <div className="h-12 w-12 overflow-hidden rounded-lg bg-[#F1F5F9]">
                      <PackCover url={getPackCover(pack.id)} label={pack.name} />
                    </div>
                    <div className="flex-1">
                      <div className="text-[16px] text-gray-900">{pack.name}</div>
                      <div className="text-[12px] text-gray-500">{count} 个表情</div>
                    </div>
                    <ChevronRight size={20} className="text-gray-300" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePack(pack.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 active:bg-gray-100 active:text-red-500"
                    aria-label={`删除${pack.name}`}
                  >
                    <Trash2 size={16} strokeWidth={2} />
                  </button>
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>

      <div className="m-2 mb-8 overflow-hidden rounded-xl bg-white">
        <button
          type="button"
          onClick={() => setSubView({ type: 'ungrouped' })}
          className="flex w-full items-center gap-3 px-4 py-3.5 active:bg-gray-50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F1F5F9] text-[#F1B136]">
            <Smile size={22} strokeWidth={1.8} />
          </div>
          <div className="flex-1 text-left">
            <div className="text-[16px] text-gray-900">未分包表情</div>
            <div className="text-[12px] text-gray-500">{packCounts.ungrouped} 个表情</div>
          </div>
          <ChevronRight size={20} className="text-gray-300" />
        </button>
      </div>
    </div>
  );

  const renderOnlineListView = () => (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto [scrollbar-width:thin]">
      {onlineGroups.length === 0 ? (
        <div className="px-4 py-10 text-center text-[14px] text-gray-400">
          还没有安装携带表情包的在线主题
        </div>
      ) : (
        onlineGroups.map(({ themeId, themeName, packs: groupPacks, count }) => (
          <div key={themeId} className="m-2 overflow-hidden rounded-xl bg-white">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F1F5F9] text-[#4E83C5]">
                <Globe size={20} strokeWidth={1.8} />
              </div>
              <div className="flex-1">
                <div className="text-[16px] text-gray-900">{themeName}</div>
                <div className="text-[12px] text-gray-500">
                  {groupPacks.length} 个表情包，{count} 个表情
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveOnlineThemeStickers(themeId)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 active:bg-gray-100 active:text-red-500"
                aria-label={`卸载${themeName}`}
              >
                <Trash2 size={16} strokeWidth={2} />
              </button>
            </div>
            {groupPacks.map((pack, index) => {
              const count = packCounts.counts.get(pack.id) || 0;
              return (
                <React.Fragment key={pack.id}>
                  {index > 0 && <div className="mx-4 h-px bg-gray-100" />}
                  <div className="flex items-center gap-3 px-4 py-3 active:bg-gray-50">
                    <button
                      type="button"
                      onClick={() => setSubView({ type: 'detail', packId: pack.id })}
                      className="flex flex-1 items-center gap-3 text-left"
                    >
                      <div className="h-12 w-12 overflow-hidden rounded-lg bg-[#F1F5F9]">
                        <PackCover url={getPackCover(pack.id)} label={pack.name} />
                      </div>
                      <div className="flex-1">
                        <div className="text-[16px] text-gray-900">{pack.name}</div>
                        <div className="text-[12px] text-gray-500">{count} 个表情</div>
                      </div>
                      <ChevronRight size={20} className="text-gray-300" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTogglePackEnabled(pack.id)}
                      className={`rounded-full px-3 py-1 text-[13px] ${
                        pack.enabled === false
                          ? 'bg-gray-100 text-gray-500'
                          : 'bg-[#E6F7ED] text-[#07C160]'
                      }`}
                    >
                      {pack.enabled === false ? '已禁用' : '已启用'}
                    </button>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        ))
      )}
    </div>
  );

  const renderStickerGrid = (items: WeChatGifSticker[], packId?: string, readonly?: boolean) => (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4 [scrollbar-width:thin]">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[14px] text-[#6F6F6F]">
          {items.length === 0 ? '还没有表情' : `共 ${items.length} 个表情`}
        </span>
        {!readonly && (
          <div className="flex items-center gap-2">
            <label className="relative flex cursor-pointer items-center gap-1 rounded-full bg-[#07C160] px-3 py-1.5 text-[13px] text-white active:opacity-85">
              <input
                type="file"
                accept="image/*"
                multiple
                className="absolute inset-0 opacity-0"
                onChange={(event) => handleImageImport(event, packId)}
              />
              <span className="pointer-events-none flex items-center gap-1">
                <ImageIcon size={14} strokeWidth={2} />
                导入图片
              </span>
            </label>
            <label className="relative flex cursor-pointer items-center gap-1 rounded-full bg-[#4E83C5] px-3 py-1.5 text-[13px] text-white active:opacity-85">
              <input
                type="file"
                accept=".zip"
                className="absolute inset-0 opacity-0"
                onChange={(event) => handleZipImport(event, packId)}
              />
              <span className="pointer-events-none flex items-center gap-1">
                <Package size={14} strokeWidth={2} />
                导入 zip
              </span>
            </label>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Smile size={48} strokeWidth={1.5} />
          <div className="mt-3 text-[14px]">{readonly ? '该表情包暂无表情' : '点击上方按钮导入表情'}</div>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-x-4 gap-y-4">
          {items.map((sticker) => (
            <div key={sticker.id} className="relative aspect-square">
              <button
                type="button"
                onClick={() => !readonly && handleRenameSticker(sticker)}
                className="h-full w-full overflow-hidden rounded-lg bg-white active:opacity-80"
              >
                <img
                  src={sticker.url}
                  alt={sticker.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </button>
              {!readonly && (
                <button
                  type="button"
                  onClick={() => handleDeleteSticker(sticker.id)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/65 text-white shadow"
                  aria-label={`删除${sticker.name}`}
                >
                  <Trash2 size={11} strokeWidth={2.5} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderDetailView = (packId: string) => {
    const pack = packById.get(packId);
    if (!pack) return null;
    const items = getStickersByPackId(packId, stickers);
    const isOnline = pack.source === 'online';
    return (
      <div className="absolute inset-0 z-[70] flex flex-col bg-[#EDEDED]">
        <div className="shrink-0 bg-[#F7F7F7] px-3 pb-3 pt-12 flex items-center border-b border-gray-200">
          <button onClick={() => setSubView({ type: 'list' })} className="text-gray-900 flex items-center active:opacity-50">
            <ChevronLeft size={28} />
            <span className="text-[17px]">返回</span>
          </button>
          <h1 className="flex-1 truncate text-center text-[17px] font-semibold text-gray-900 pr-10">
            {pack.name}
          </h1>
        </div>

        <div className="m-2 flex items-center gap-3 rounded-xl bg-white px-4 py-3">
          <div className="h-16 w-16 overflow-hidden rounded-xl bg-[#F1F5F9]">
            <PackCover url={getPackCover(pack.id)} label={pack.name} />
          </div>
          <div className="flex-1">
            <div className="text-[17px] font-medium text-gray-900">{pack.name}</div>
            <div className="text-[13px] text-gray-500">{items.length} 个表情</div>
          </div>
          {isOnline ? (
            <button
              type="button"
              onClick={() => handleTogglePackEnabled(pack.id)}
              className={`rounded-full px-3 py-1 text-[14px] ${
                pack.enabled === false
                  ? 'bg-gray-100 text-gray-500'
                  : 'bg-[#E6F7ED] text-[#07C160]'
              }`}
            >
              {pack.enabled === false ? '已禁用' : '已启用'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleRenamePack(pack.id)}
              className="text-[14px] text-[#4E83C5] active:opacity-60"
            >
              重命名
            </button>
          )}
        </div>

        {renderStickerGrid(items, pack.id, isOnline)}

        {!isOnline && (
          <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-3">
            <button
              type="button"
              onClick={() => handleDeletePack(pack.id)}
              className="w-full rounded-lg py-3 text-center text-[16px] text-red-500 active:bg-gray-50"
            >
              删除表情包
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderUngroupedView = () => {
    const items = getStickersByPackId(undefined, stickers);
    return (
      <div className="absolute inset-0 z-[70] flex flex-col bg-[#EDEDED]">
        <div className="shrink-0 bg-[#F7F7F7] px-3 pb-3 pt-12 flex items-center border-b border-gray-200">
          <button onClick={() => setSubView({ type: 'list' })} className="text-gray-900 flex items-center active:opacity-50">
            <ChevronLeft size={28} />
            <span className="text-[17px]">返回</span>
          </button>
          <h1 className="flex-1 text-center text-[17px] font-semibold text-gray-900 pr-10">
            未分包表情
          </h1>
        </div>
        {renderStickerGrid(items, undefined, false)}
      </div>
    );
  };

  return (
    <div className="absolute inset-0 z-[60] flex flex-col bg-[#EDEDED]">
      {subView.type === 'list' && (
        <>
          <div className="shrink-0 bg-[#F7F7F7] px-3 pb-3 pt-12 flex items-center border-b border-gray-200">
            <button onClick={onBack} className="text-gray-900 flex items-center active:opacity-50">
              <ChevronLeft size={28} />
              <span className="text-[17px]">返回</span>
            </button>
            <h1 className="flex-1 text-center text-[17px] font-semibold text-gray-900 pr-10">
              我的表情包
            </h1>
          </div>
          {renderModeTabs()}
          {mode === 'local' ? renderLocalListView() : renderOnlineListView()}
        </>
      )}

      {subView.type === 'detail' && renderDetailView(subView.packId)}
      {subView.type === 'ungrouped' && renderUngroupedView()}

      <Toast message={toast} />
    </div>
  );
};
