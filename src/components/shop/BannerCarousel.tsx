import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { bannerIndex } from '../../domain/bannerUi';

import type { Banner, BannerTheme } from '../../domain/content';
import { useT } from '../../i18n';
import { openLink } from '../../lib/nav';
import { colors, fonts, gradients, radius } from '../../theme/tokens';
import { Icon, PartIcon } from '../ui/Icon';
import { PressableScale } from '../ui/PressableScale';
import { Txt } from '../ui/Txt';

const THEMES: Record<BannerTheme, { colors: readonly [string, string, ...string[]]; dark: boolean }> = {
  brand: { colors: gradients.brand, dark: true },
  night: { colors: gradients.night, dark: true },
  sky: { colors: gradients.sky, dark: false },
  // Aksiya: yumshoq iliq fon, to'q matn (avvalgi to'q qizil fon ko'zni charchatardi).
  sunrise: { colors: gradients.sunrise, dark: false },
  mint: { colors: gradients.mint, dark: false },
};

const ART = {
  gm: require('../../../assets/home/gm-parts.webp'),
  accessories: require('../../../assets/home/accessories.webp'),
};

const GAP = 10;
const AUTO_MS = 4800;

/**
 * Native scrolling on both web and phone; admin preview never navigates or auto-rotates.
 * Stop automatic rotation while unfocused/backgrounded or shortly after user interaction.
 */
export function BannerCarousel({ banners, preview=false }: { banners: Banner[]; preview?:boolean }) {
  const { width } = useWindowDimensions();
  const [measured,setMeasured]=useState(0);
  const cardW=Math.max(1,Math.min(measured||width,760)-32);
  const cardH=Math.round(Math.max(156,Math.min(cardW*0.46,230)));
  const interval=cardW+GAP;
  const ref=useRef<ScrollView>(null);
  const indexRef=useRef(0);
  const lastTouch=useRef(0);
  const [index,setIndex]=useState(0);
  const focused=useIsFocused();
  const signature=JSON.stringify(banners.map(b=>b.id));
  const count=banners.length;
  useEffect(()=>{
    indexRef.current=0;setIndex(0);ref.current?.scrollTo({x:0,animated:false});
  },[signature,interval]);
  useEffect(()=>{
    if(preview||!focused||count<2)return;
    const timer=setInterval(()=>{
      if(AppState.currentState==='background'||AppState.currentState==='inactive'||Date.now()-lastTouch.current<AUTO_MS)return;
      const next=(indexRef.current+1)%count;
      ref.current?.scrollTo({x:next*interval,animated:true});
    },AUTO_MS);
    return ()=>clearInterval(timer);
  },[count,focused,interval,preview]);
  if(!count)return null;
  return (
    <View onLayout={e=>setMeasured(e.nativeEvent.layout.width)}>
      <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false}
        scrollEnabled={count>1} decelerationRate="fast" snapToInterval={interval}
        disableIntervalMomentum contentContainerStyle={{paddingHorizontal:16,gap:GAP}}
        scrollEventThrottle={32}
        onTouchStart={()=>{lastTouch.current=Date.now();}}
        onScrollBeginDrag={()=>{lastTouch.current=Date.now();}}
        onScrollEndDrag={()=>{lastTouch.current=Date.now();}}
        onScroll={e=>{
          const next=bannerIndex(e.nativeEvent.contentOffset.x,interval,count);
          if(next!==indexRef.current){indexRef.current=next;setIndex(next);}
        }}>
        {banners.map(b=><BannerCard key={b.id} banner={b} width={cardW} height={cardH} preview={preview}/>)}
      </ScrollView>
      {count>1?<View style={styles.dots}>
        {banners.map((b,i)=><Pressable key={b.id} accessibilityRole="button" accessibilityLabel={String(i+1)} accessibilityState={{selected:index===i}} hitSlop={5} onPress={()=>{lastTouch.current=Date.now();ref.current?.scrollTo({x:i*interval,animated:true});}} style={[styles.dot,{width:index===i?22:7,opacity:index===i?1:0.35}]}/>)}
      </View>:null}
    </View>
  );
}

function BannerCard({banner:b,width,height,preview}:{banner:Banner;width:number;height:number;preview:boolean}){
  const { lang } = useT();
  const theme = THEMES[b.theme];
  const fg = theme.dark ? colors.white : colors.ink;
  return (
    <PressableScale disabled={preview} dimWhenDisabled={false} onPress={preview?undefined:() => openLink(b.link, b.title[lang].replace(/\n/g, ' '))} scaleTo={0.98} feedback="tap" unstable_pressDelay={110}
      accessibilityLabel={`${b.title[lang].replace(/\n/g, ' ')}. ${b.cta[lang]}`}
      style={[styles.card, { width, height }]}>
      <LinearGradient colors={theme.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.circle, { width: height * 1.3, height: height * 1.3, right: -height * 0.45, top: -height * 0.5, borderColor: theme.dark ? 'rgba(255,255,255,0.10)' : 'rgba(33,115,177,0.08)' }]} />
      <View style={[styles.circle, { width: height * 0.7, height: height * 0.7, right: width * 0.32, bottom: -height * 0.42, borderColor: theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(33,115,177,0.07)' }]} />
      <View style={styles.art} pointerEvents="none">
        <BannerArt banner={b} height={height} width={width} dark={theme.dark} warm={b.theme === 'sunrise'} />
      </View>
      <View style={styles.copy}>
        <Txt style={[styles.title, { color: fg, fontSize: height > 190 ? 24 : 20, lineHeight: height > 190 ? 29 : 25 }]} numberOfLines={3}>{b.title[lang]}</Txt>
        {b.text[lang] ? <Txt variant="small" color={theme.dark ? colors.onBrandMuted : colors.muted} numberOfLines={2} style={styles.text}>{b.text[lang]}</Txt> : null}
        <View style={[styles.cta, { backgroundColor: theme.dark ? colors.white : colors.primary }]}>
          <Txt variant="smallStrong" color={theme.dark ? colors.primary : colors.white}>{b.cta[lang]}</Txt>
          <Icon name="arrow-forward" size={15} color={theme.dark ? colors.primary : colors.white} />
        </View>
      </View>
    </PressableScale>
  );
}

/** Invalid external images fall back to the selected built-in art. */
function BannerArt({ banner: b, height, width, dark, warm }: { banner: Banner; height: number; width: number; dark: boolean; warm: boolean }) {
  // Rasm kartaning o'ng yarmidan chiqmaydi — chapdagi matn ustiga tushmaydi.
  const maxW = width * 0.46;
  const [failed,setFailed]=useState<string|null>(null);
  if (b.image&&failed!==b.image) return <Image source={{ uri: b.image }} onError={()=>setFailed(b.image??null)} style={{ width: Math.min(height * 1.05, maxW), height: height * 0.9 }} contentFit="contain" />;
  if (b.art === 'gm' || b.art === 'accessories') {
    return <Image source={ART[b.art]} style={{ width: Math.min(height * 1.25, maxW), height: height * 0.84 }} contentFit="contain" />;
  }
  const iconColor = dark ? colors.white : warm ? colors.sale : colors.primary;
  const bubble = dark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.8)';
  if (b.art === 'sale') {
    return (
      <View style={[styles.bubble, styles.tilt, { width: height * 0.72, height: height * 0.72, backgroundColor: bubble }]}>
        <Txt style={[styles.percent, { fontSize: height * 0.36, lineHeight: height * 0.42, color: iconColor }]}>%</Txt>
      </View>
    );
  }
  return (
    <View style={[styles.bubble, { width: height * 0.72, height: height * 0.72, backgroundColor: bubble }]}>
      <PartIcon name={b.art === 'cash' ? 'cash-multiple' : b.art === 'delivery' ? 'truck-fast' : 'car-cog'} size={height * 0.36} color={iconColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, overflow: 'hidden' },
  circle: { position: 'absolute', borderRadius: 999, borderWidth: 18 },
  art: { position: 'absolute', right: 6, bottom: 4, top: 4, justifyContent: 'center', alignItems: 'flex-end' },
  copy: { flex: 1, width: '54%', padding: 18, paddingRight: 6, justifyContent: 'center', gap: 6 },
  title: { fontFamily: fonts.display, letterSpacing: -0.5 },
  text: { marginTop: -2 },
  cta: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 34, borderRadius: radius.pill, marginTop: 4 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { height: 7, borderRadius: 4, backgroundColor: colors.primary },
  bubble: { borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  tilt: { transform: [{ rotate: '-8deg' }] },
  percent: { fontFamily: fonts.displayHeavy },
});
