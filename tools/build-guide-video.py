# Turns the recorded frames into guide/level-up-guide.mp4 and writes the
# EN/RU/UZ subtitles from the caption times logged during the recording.
import json, subprocess, sys, os
V=sys.argv[1]; G=sys.argv[2]; crf=sys.argv[3] if len(sys.argv)>3 else '27'
tl=json.load(open(V+'/timeline.json')); fr=tl['frames']; caps=tl['caps']
start=fr[0]['t']; end=tl['tEnd']
with open(V+'/list.txt','w') as f:
    for a,b in zip(fr, fr[1:]+[None]):
        d=(b['t'] if b else end)-a['t']
        f.write("file '%s'\nduration %.4f\n" % (a['file'], max(d,0.001)))
    f.write("file '%s'\n" % fr[-1]['file'])
os.makedirs(G,exist_ok=True)
out=G+'/level-up-guide.mp4'
cmd=['ffmpeg','-y','-loglevel','error','-f','concat','-safe','0','-i',V+'/list.txt',
     '-vf','fps=30,scale=720:-2:flags=lanczos,format=yuv420p','-c:v','libx264','-preset','slow','-crf',crf,
     '-profile:v','high','-movflags','+faststart','-an',out]
subprocess.run(cmd,check=True)
TR={
"Open LEVEL UP and tap START. No account is needed.":("Открой LEVEL UP и нажми НАЧАТЬ. Аккаунт не нужен.","LEVEL UP ni oching va BOSHLASH ni bosing. Hisob kerak emas."),
"The System welcomes you and gives you your first quest.":("Система приветствует тебя и даёт первый квест.","Tizim sizni kutib oladi va birinchi kvestni beradi."),
"TODAY shows your Daily Quest: small tasks that reset every day.":("СЕГОДНЯ показывает ежедневный квест: небольшие задания, которые обновляются каждый день.","BUGUN boʻlimida kunlik kvest: har kuni yangilanadigan kichik vazifalar."),
"Do the task for real, then tap COMPLETE to earn XP.":("Выполни задание по-настоящему, затем нажми ВЫПОЛНИТЬ и получи XP.","Vazifani haqiqatan bajaring, soʻng XP olish uchun BAJARISH ni bosing."),
"Tap + to add your own goal.":("Нажми +, чтобы добавить свою цель.","Oʻz maqsadingizni qoʻshish uchun + ni bosing."),
"Name it, pick an icon and how hard it is, then save. Daily quests unlock as you level up.":("Дай ей название, выбери значок и сложность, затем сохрани. Ежедневные квесты открываются с ростом уровня.","Unga nom bering, belgi va qiyinlikni tanlang, soʻng saqlang. Kunlik kvestlar darajangiz oshgani sari ochiladi."),
"Your quests and goals live in QUESTS.":("Твои квесты и цели — во вкладке КВЕСТЫ.","Kvest va maqsadlaringiz KVESTLAR boʻlimida."),
"Tap the timer to time your focus. Real work time is saved.":("Нажми на таймер, чтобы засечь время работы. Реальное время сохраняется.","Diqqat vaqtini oʻlchash uchun taymerni bosing. Haqiqiy ish vaqti saqlanadi."),
"Done? Tap COMPLETE. Harder goals give more XP.":("Готово? Нажми ВЫПОЛНИТЬ. Сложные цели дают больше XP.","Bajardingizmi? BAJARISH ni bosing. Qiyinroq maqsadlar koʻproq XP beradi."),
"Fill the XP bar to LEVEL UP. Each level brings rewards and opens new parts of the app.":("Заполни шкалу XP, чтобы поднять уровень. Каждый уровень приносит награды и открывает новые разделы.","Darajani oshirish uchun XP chizigʻini toʻldiring. Har bir daraja mukofot beradi va ilovaning yangi qismlarini ochadi."),
"PROGRESS: your hero, the level road with its rewards, and your stats.":("ПРОГРЕСС: твой герой, дорога уровней с наградами и статистика.","TARAQQIYOT: qahramoningiz, mukofotli darajalar yoʻli va statistika."),
"MORE: Learn & Grow, Clan, Budget, this Guide and Settings.":("ЕЩЁ: учёба и рост, клан, бюджет, этот гид и настройки.","KOʻPROQ: oʻrganish va oʻsish, klan, byudjet, ushbu qoʻllanma va sozlamalar."),
"Watch this video and replay the tour any time in MORE → GUIDE.":("Это видео и тур всегда доступны в ЕЩЁ → ГИД.","Bu video va sayohat istalgan payt KOʻPROQ → QOʻLLANMA da."),
"That is all. Now it is your turn. Good luck, Hero!":("Вот и всё. Теперь твоя очередь. Удачи, герой!","Mana shu. Endi navbat sizda. Omad, Qahramon!")}
def ts(x):
    x=max(0,x); h=int(x//3600); m=int(x%3600//60); s=x%60
    return "%02d:%02d:%06.3f" % (h,m,s)
for li,lang in enumerate(['en','ru','uz']):
    lines=['WEBVTT','']
    for i,c in enumerate(caps):
        a=c['t']-start; b=(caps[i+1]['t'] if i+1<len(caps) else end)-start-0.05
        text=c['text'] if lang=='en' else TR[c['text']][li-1]
        lines+=[str(i+1), ts(a)+' --> '+ts(b)+' line:85%', text, '']
    open(G+'/level-up-guide.%s.vtt' % lang,'w',encoding='utf8').write('\n'.join(lines))
pr=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration,size','-of','json',out],capture_output=True,text=True)
print(pr.stdout)
