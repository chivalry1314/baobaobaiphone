import { defineConfig } from 'vitepress';
import { chineseSearchOptimize, pagefindPlugin } from 'vitepress-plugin-pagefind';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'BaobaobaiPhone 操作手册',
  description: 'BaobaobaiPhone 项目使用与开发文档',
  base: '/',
  lang: 'zh-CN',
  lastUpdated: true,

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#3B82F6' }],
  ],

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '/logo.svg',
    nav: [
      { text: '首页', link: '/' },
      { text: '使用指南', link: '/guide/getting-started' },
      { text: '应用说明', link: '/apps/appmarket' },
      { text: 'API', link: '/api/push-api' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '开始',
          items: [
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '项目架构', link: '/guide/architecture' },
          ],
        },
        {
          text: '开发',
          items: [
            { text: '开发规范', link: '/guide/development' },
            { text: '新增应用', link: '/guide/add-app' },
          ],
        },
        {
          text: '部署',
          items: [
            { text: '构建与部署', link: '/guide/deployment' },
            { text: 'Web Push 接口', link: '/api/push-api' },
          ],
        },
      ],
      '/apps/': [
        {
          text: '系统应用',
          items: [
            { text: '应用市场', link: '/apps/appmarket' },
            { text: '通讯录', link: '/apps/contacts' },
            { text: '记忆中心', link: '/apps/memorycenter' },
            { text: '查手机', link: '/apps/phoneinspector' },
            { text: '定时任务', link: '/apps/scheduler' },
            { text: '设置', link: '/apps/settings' },
            { text: '文件管理', link: '/apps/storage' },
            { text: '备忘录', link: '/apps/worldbook' },
          ],
        },
        {
          text: '业务应用',
          items: [
            { text: '每日剧本', link: '/apps/dailyscript' },
            { text: '日记心语', link: '/apps/dailywords' },
            { text: '外卖', link: '/apps/delivery' },
            { text: '梦音乐', link: '/apps/dreammusic' },
            { text: '情侣空间', link: '/apps/lovespace' },
            { text: '纸间魔法', link: '/apps/papermagic' },
            { text: '人设生成器', link: '/apps/personagenerator' },
            { text: '开店吧', link: '/apps/seller' },
            { text: '去逛街', link: '/apps/shopping' },
            { text: '模板', link: '/apps/template' },
            { text: '暖迹', link: '/apps/warmtrack' },
            { text: '天气', link: '/apps/weather' },
            { text: '微信', link: '/apps/wechat' },
          ],
        },
      ],
    },

    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/baobaobaiphone/baobaobaiphone',
      },
    ],

    editLink: {
      pattern: 'https://github.com/baobaobaiphone/baobaobaiphone/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页',
    },

    docFooter: {
      prev: '上一页',
      next: '下一页',
    },

    outline: {
      label: '页面导航',
    },

    lastUpdated: {
      text: '最后更新于',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'short',
      },
    },

    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: '搜索',
                buttonAriaLabel: '搜索文档',
              },
              modal: {
                displayDetails: '显示详细列表',
                resetButtonTitle: '清除查询',
                backButtonTitle: '关闭搜索',
                noResultsText: '未找到相关结果',
                footer: {
                  selectText: '选择',
                  selectKeyAriaLabel: '回车',
                  navigateText: '切换',
                  navigateUpKeyAriaLabel: '上箭头',
                  navigateDownKeyAriaLabel: '下箭头',
                  closeText: '关闭',
                  closeKeyAriaLabel: 'esc',
                },
              },
            },
          },
        },
      },
    },
  },

  vite: {
    plugins: [
      pagefindPlugin({
        customSearchQuery: chineseSearchOptimize,
        btnPlaceholder: '搜索',
        placeholder: '搜索文档',
        emptyText: '空空如也',
        heading: '共 {{searchResult}} 条结果',
        showDate: false,
        excludeSelector: ['img', 'a.header-anchor', '.line-numbers', '.vp-doc > div > *.gtoc'],
      }),
    ],
  },
});
