// GEO Star Engine 常量定义

export const INDUSTRIES = [
  '户外运动', '数码3C', '美妆护肤', '服装鞋帽', '食品饮料',
  '家居家电', '母婴育儿', '汽车用品', '图书教育', '医疗健康',
  '金融保险', '旅游出行', '宠物用品', '厨具用品', '办公设备',
]

export const PLATFORMS = [
  { value: 'douyin', label: '抖音' },
  { value: 'xiaohongshu', label: '小红书' },
  { value: 'bilibili', 'label': 'B站' },
  { value: 'weibo', label: '微博' },
  { value: 'kuaishou', label: '快手' },
  { value: 'wechat', label: '微信公众号' },
]

export const GEO_LEVEL_CONFIG = [
  { min: 80, label: '优秀', color: '#67C23A', className: 'geo-excellent' },
  { min: 60, label: '良好', color: '#409EFF', className: 'geo-good' },
  { min: 40, label: '一般', color: '#E6A23C', className: 'geo-fair' },
  { min: 0, label: '较差', color: '#F56C6C', className: 'geo-poor' },
]
