# HotspotRadar 视觉风格规范手册

> 基于 HotspotRadar.tsx 完整拆解，供所有 GEO 页面风格对齐参考

---

## 一、页面整体背景

```jsx
// 最外层容器
<div className="-m-4 md:-m-6 min-h-[calc(100vh+3rem)] bg-[#050510] relative overflow-hidden">

// 背景特效层（z-0）
<BackgroundBeams className="z-0" />
<Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="#3b82f6" />

// 装饰性光球（固定定位，不随滚动）
<div className="fixed top-0 right-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
<div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

// 主内容区
<div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
```

**核心原则：**
- 页面背景固定为 `#050510`（极深蓝黑）
- `-m-4 md:-m-6` 负边距覆盖 AppLayout 的内边距，让内容区撑满
- 背景特效只在 HotspotRadar 内部使用，GEO 页面不需要（AppLayout 已提供统一深色背景）

---

## 二、色彩系统

### 2.1 主背景色
| 用途 | 色值 | Tailwind class |
|------|------|---------------|
| 页面根背景 | `#050510` | `bg-[#050510]` |
| 顶栏背景 | `#0b1a2e`（95%透明度） | `bg-[#0b1a2e]/95 backdrop-blur-xl` |
| 侧边栏背景 | `#0a0a1a`（80%透明度） | `bg-[#0a0a1a]/80 backdrop-blur-xl` |
| 内容卡片背景 | 透明→5%白 | `bg-white/[0.02]` ~ `bg-white/[0.04]` |

### 2.2 文字颜色层级
| 用途 | 色值 | 示例 |
|------|------|------|
| 主要文字（标题、数字） | 纯白 | `text-white` |
| 次要文字（正文） | 灰白 | `text-gray-300` |
| 辅助文字（标签、说明） | 中灰 | `text-gray-400` |
| 弱化文字（元信息） | 深灰 | `text-slate-500` ~ `text-slate-600` |
| 强调文字（链接、交互） | 亮蓝 | `text-blue-400` |
| 成功/正向 | 翠绿 | `text-emerald-400` |
| 警告/热度高 | 橙色 | `text-orange-400` |
| 危险/紧急 | 红色 | `text-red-400` |

### 2.3 状态颜色配方（带透明度和边框）
```jsx
// 紧急 urgent
"bg-red-500/15 text-red-400 border border-red-500/20"

// 高 high
"bg-orange-500/15 text-orange-400 border border-orange-500/20"

// 中 medium
"bg-amber-500/15 text-amber-400 border border-amber-500/20"

// 低 low / 成功
"bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"

// 关键词标签
"bg-blue-500/10 text-blue-400 border border-blue-500/20"

// 可疑（不真实）
"bg-red-500/10 text-red-400 border border-red-500/20"

// 可信
"bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"

// 热度综合指标
"bg-white/5 border border-white/10" + 动态 color
```

---

## 三、字体系统

```jsx
// 页面大标题
className="text-lg font-semibold text-white"

// 卡片内小标题
className="text-base font-semibold text-white"

// 正文
className="text-sm text-gray-300"

// 辅助说明
className="text-xs text-gray-400"

// 元信息（时间戳、计数）
className="text-[11px] text-slate-600"

// 标签/徽章文字
className="text-[10px] font-semibold uppercase"

// 数字强调（统计卡片）
className="text-3xl font-bold text-white"
```

**字号规范：**
- `text-3xl` (30px)：大数字统计
- `text-lg` (18px)：页面区块标题
- `text-base` (16px)：卡片标题
- `text-sm` (14px)：正文
- `text-xs` (12px)：辅助说明
- `text-[11px]`：元信息
- `text-[10px]` (10px)：标签/徽章

---

## 四、圆角系统

| 元素 | 圆角 | Tailwind |
|------|------|---------|
| 页面主容器 | 0（通铺） | - |
| 主内容卡片 | 1.25rem (20px) | `rounded-2xl` |
| 次要卡片/输入框 | 0.75rem (12px) | `rounded-xl` |
| 小型元素（徽章/标签） | 0.375rem (6px) | `rounded-lg` |
| 圆形指示器 | 全圆 | `rounded-full` |
| 按钮 | 同上级卡片 | - |

---

## 五、卡片系统

### 5.1 主列表卡片（如热点条目）
```jsx
// 默认状态
className="group p-5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 transition-all"

// 选中/激活状态
className="... bg-blue-500/10 border-blue-500/30"
```

### 5.2 统计数字卡片（如总热点/今日新增）
```jsx
// 带渐变方向的主统计卡
className="relative group p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/10 overflow-hidden"

// 悬停效果（渐变叠加）
className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
```

### 5.3 表单/输入区卡片
```jsx
className="p-5 rounded-2xl bg-white/[0.02] border border-white/5"
```

### 5.4 空状态占位
```jsx
className="text-center py-16 rounded-2xl border border-dashed border-white/10"
```

---

## 六、边框系统

```jsx
// 常规卡片边框
border-white/5       // 5% 白色（几乎看不见）
border-white/10      // 10% 白色（轻微可见）

// 悬停态边框
hover:border-white/10
hover:border-white/20

// 强调边框（选中/激活）
border-blue-500/30
border-purple-500/20

// 虚线边框（空状态）
border-dashed border-white/10
```

---

## 七、输入框系统

### 7.1 标准文本输入框
```jsx
<input
  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm
             placeholder-slate-600
             focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20
             transition-all"
/>
```

### 7.2 搜索框（带图标）
```jsx
<div className="relative">
  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
  <input
    className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10
               text-white placeholder-slate-600
               focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20
               transition-all"
  />
</div>
```

### 7.3 Select 下拉框
```jsx
<select
  className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10
             text-white text-sm
             focus:outline-none focus:border-purple-500/50 transition-all"
>
```

---

## 八、按钮系统

### 8.1 主要按钮（渐变，CTX 调用）
```jsx
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  className="px-6 py-3 rounded-xl
             bg-gradient-to-r from-blue-600 to-cyan-500
             text-white font-medium
             flex items-center gap-2
             shadow-lg shadow-blue-500/25
             disabled:opacity-50 disabled:cursor-not-allowed"
>
```

### 8.2 次要按钮（透明+边框）
```jsx
<button
  className="px-4 py-2 rounded-xl
             bg-white/5 border border-white/10
             text-gray-300
             hover:bg-white/10 hover:border-white/20
             transition-all
             disabled:opacity-30 disabled:cursor-not-allowed"
>
```

### 8.3 图标按钮（纯图标交互）
```jsx
<button
  className="p-2.5 rounded-xl
             bg-white/5
             text-slate-500
             hover:text-blue-400 hover:bg-blue-500/20
             transition-all
             opacity-0 group-hover:opacity-100"  // 组合悬停显示
>
```

### 8.4 分页按钮
```jsx
<button
  className="p-2 rounded-xl
             bg-white/5 border border-white/10
             text-slate-400
             hover:text-white hover:border-white/20
             transition-all
             disabled:opacity-30 disabled:cursor-not-allowed"
>
```

### 8.5 危险操作按钮
```jsx
<button
  className="p-1 rounded text-slate-600
             hover:text-red-400 hover:bg-red-500/10
             transition-all"
>
```

---

## 九、Tab 切换

```jsx
{({ key, label, icon: Icon }) => (
  <button
    key={key}
    onClick={() => setActiveTab(key)}
    className={cn(
      "px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all",
      activeTab === key
        ? 'bg-white/10 text-white border border-white/10'
        : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
    )}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
)}
```

---

## 十、徽章/标签系统

### 10.1 重要性等级徽章
```jsx
<span className={cn(
  "px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase flex items-center",
  importance === 'urgent' && "bg-red-500/15 text-red-400 border border-red-500/20",
  importance === 'high' && "bg-orange-500/15 text-orange-400 border border-orange-500/20",
  importance === 'medium' && "bg-amber-500/15 text-amber-400 border border-amber-500/20",
  importance === 'low' && "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
)}>
  {getImportanceIcon(importance)}
  <span className="ml-1">{importance}</span>
</span>
```

### 10.2 关键词标签
```jsx
<span className="text-[10px] px-2 py-0.5 rounded-md
                 bg-blue-500/10 text-blue-400 border border-blue-500/20">
  {keyword.text}
</span>
```

### 10.3 真实性标记
```jsx
{!hotspot.isReal && (
  <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md
                  bg-red-500/10 text-red-400 border border-red-500/20">
    <ShieldAlert className="w-3 h-3" />
    可疑
  </span>
)}
```

### 10.4 热度标签
```jsx
<span className={cn(
  "flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md
   bg-white/5 border border-white/10 font-medium",
  heat.color  // text-red-400 / text-orange-400 / text-amber-400 / text-blue-400
)}>
  <ThermometerSun className="w-3 h-3" />
  {heat.label} {heatScore}
</span>
```

---

## 十一、Toast 通知

```jsx
<motion.div
  initial={{ opacity: 0, y: -20, x: '-50%' }}
  animate={{ opacity: 1, y: 0, x: '-50%' }}
  exit={{ opacity: 0, y: -20 }}
  className={cn(
    "fixed top-6 left-1/2 z-[70] px-5 py-3 rounded-xl backdrop-blur-xl
     flex items-center gap-3 shadow-2xl",
    type === 'success'
      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
      : 'bg-red-500/10 border border-red-500/30 text-red-400'
  )}
>
  {type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
  <span className="text-sm font-medium">{message}</span>
</motion.div>
```

**定位：`fixed top-6 left-1/2 z-[70]`，x 居中用 `x: '-50%'`**

---

## 十二、动画系统

### 12.1 入场动画（列表项）
```jsx
<motion.div
  initial={{ opacity: 0, x: -10 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ delay: index * 0.03 }}  // 逐项延迟
>
```

### 12.2 数字卡片入场
```jsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.05 }}  // 依次延迟
>
```

### 12.3 折叠/展开动画
```jsx
<AnimatePresence>
  {expanded && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="overflow-hidden"
    >
      {/* 内容 */}
    </motion.div>
  )}
</AnimatePresence>
```

### 12.4 按钮按压反馈
```jsx
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
>
```

---

## 十三、分页器

```jsx
<div className="flex items-center justify-center gap-3 mt-6">
  {/* 上一页 */}
  <button className="p-2 rounded-xl bg-white/5 border border-white/10
                     text-slate-400 hover:text-white hover:border-white/20
                     transition-all disabled:opacity-30 disabled:cursor-not-allowed">
    <ChevronLeft className="w-4 h-4" />
  </button>

  {/* 页码 */}
  <div className="flex items-center gap-1.5">
    {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
      return (
        <button
          key={page}
          className={cn(
            "w-8 h-8 rounded-lg text-xs font-medium transition-all",
            currentPage === page
              ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
              : "text-slate-500 hover:text-white hover:bg-white/5"
          )}
        >
          {page}
        </button>
      );
    })}
  </div>

  {/* 下一页 */}
  <button className="p-2 rounded-xl bg-white/5 border border-white/10
                     text-slate-400 hover:text-white hover:border-white/20
                     transition-all disabled:opacity-30 disabled:cursor-not-allowed">
    <ChevronRight className="w-4 h-4" />
  </button>

  {/* 总数 */}
  <span className="text-xs text-slate-600 ml-2">
    共 {total} 条
  </span>
</div>
```

---

## 十四、加载状态

### 14.1 页面级加载
```jsx
<div className="min-h-screen bg-[#050510] flex items-center justify-center">
  <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
</div>
```

### 14.2 内容区加载
```jsx
<div className="flex items-center justify-center py-16">
  <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
</div>
```

### 14.3 按钮内加载
```jsx
{isLoading ? (
  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
) : (
  <Search className="w-4 h-4" />
)}
```

---

## 十五、开关控件

```jsx
<button
  className={cn(
    "relative w-10 h-5 rounded-full transition-all",
    isActive ? "bg-blue-500" : "bg-slate-700"
  )}
  title={isActive ? '点击暂停扫描' : '点击开始扫描'}
>
  <div className={cn(
    "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all",
    isActive ? "left-[22px]" : "left-0.5"
  )} />
</button>
```

---

## 十六、Modal/弹窗

```jsx
<motion.div
  initial={{ opacity: 0, y: -4 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -4 }}
  className="absolute bottom-full left-0 right-0 mb-2
             bg-[#0c0c20]/95 backdrop-blur-2xl
             rounded-xl border border-purple-500/20
             shadow-2xl shadow-purple-500/10
             overflow-hidden z-[70]"
>
```

---

## 十七、实用工具类汇总

```js
// 文字省略
line-clamp-2        // 最多2行
truncate            // 单行省略

// 分割线
divide-y divide-white/5           // 列表项分割
border-t border-white/5           // 顶部分割

// 阴影
shadow-2xl shadow-purple-500/10   // 弹窗投影

// 指针事件
pointer-events-none                // 装饰性光球

// 滚动条（配合 overflow-y-auto）
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: white/10; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: white/20; }
```

---

## 十八、快速对照表

| 元素 | 默认 | 悬停 |
|------|------|------|
| 主卡片背景 | `bg-white/[0.02]` | `hover:bg-white/[0.04]` |
| 主卡片边框 | `border-white/5` | `hover:border-white/10` |
| 次要卡片 | `bg-white/[0.02] border-white/5` | `hover:bg-white/[0.04] hover:border-white/10` |
| 文字颜色 | `text-slate-500` | `hover:text-slate-300` |
| 交互文字 | `text-slate-500` | `hover:text-blue-400` |
| 图标按钮 | `bg-white/5 text-slate-500` | `hover:bg-blue-500/20 hover:text-blue-400` |
| 输入框 | `bg-white/5 border-white/10` | `focus:border-blue-500/50` |

---

*本文档由 AI 基于 HotspotRadar.tsx 自动生成，所有样式值均可直接复制使用。*
