import {payloadFromDataset} from './import-core.js';
export function buildSimpleWorkbook(E,dataset){
 const payload=payloadFromDataset(dataset),wb=new E.Workbook(),s=wb.addWorksheet('Isi Data'),g=wb.addWorksheet('Panduan');
 const names={ALADIN:'Aladin Syariah',ALLO:'Allo Bank',AMAR:'Amar Bank',BLU:'blu by BCA Digital',HIBANK:'hibank',JAGO:'Bank Jago',KROM:'Krom Bank',NEOBANK:'Neo Commerce',RAYA:'Bank Raya',SAQU:'Bank Saqu',SEABANK:'SeaBank',SUPERBANK:'Superbank'};
 const label=b=>dataset.issuerMeta?.[b]?.name||names[b]||b;
 const rows=payload.issuers.flatMap(b=>payload.metrics.map(m=>[label(b.Kode_Emiten),m.Nama_Metrik,m.Satuan,...dataset.periods.map(p=>dataset.values[b.Kode_Emiten]?.[m.Kode_Metrik]?.[p]??null)]));
 s.getCell('A2').value='DigiMetric — data keuangan';s.getCell('A3').value='Isi atau ubah angka pada kolom periode berwarna kuning muda. Petunjuk ada di sheet Panduan.';
 s.getCell('A4').value='Nominal: Rp miliar. Rasio: angka persen, misalnya 3,86 untuk 3,86%. Tanpa pembulatan tambahan.';
 s.getCell('A5').value='Kosong = pertahankan data lama. Angka 0 = nol. HAPUS = mengosongkan nilai pada dashboard.';
 s.getCell('A6').value='Tambah kolom periode di kanan, dengan judul FY2026 atau Q3 2026 pada baris 7.';
 const headers=['Bank','Indikator','Satuan',...dataset.periods.map(p=>p.replace(/^FY/,'FY ').replace('-',' '))];
 s.addTable({name:'DataKeuangan',ref:'A7',headerRow:true,style:{theme:'TableStyleMedium2',showRowStripes:true},columns:headers.map(name=>({name,filterButton:true})),rows});
 s.columns.forEach((c,i)=>{c.width=[25,34,16][i]||21;});s.views=[{state:'frozen',xSplit:3,ySplit:7,showGridLines:false}];
 s.eachRow((row,i)=>{row.height=i===7?34:25;row.eachCell(cell=>{cell.font={name:'Arial',size:11,color:{argb:'FF20364B'}};if(i===7){cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF20364B'}};cell.font.color={argb:'FFFFFFFF'};cell.font.bold=true;}
 if(i>=8&&cell.col>=4){cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFF8E7'}};cell.font.color={argb:'FF174A95'};cell.numFmt='#,##0.################;[Red](#,##0.################);"0"';}});});s.getCell('A2').font={name:'Arial',size:16,bold:true};
 g.getCell('A2').value='Cara mengisi dan mengunggah';g.getCell('A2').font={name:'Arial',size:16,bold:true};
 const instructions=[['Langkah','Yang perlu dilakukan'],['1. Pilih bank','Filter Bank dan Indikator pada Isi Data untuk menemukan angka yang akan diperbarui.'],['2. Isi angka','Edit sel kuning. Nominal dalam Rp miliar; persen berupa angka biasa, misalnya 3,86. Jangan membulatkan.'],['3. Tambah periode','Tambahkan kolom di kanan dengan judul FY2026 atau Q3 2026 pada baris 7.'],['4. Catat sumber','Tambahkan bank, periode, link dan catatan pada tabel sumber di bawah.'],['5. Unggah','Simpan .xlsx, buka Unggah Excel di DigiMetric lalu pilih file. Data otomatis tersimpan tanpa login.'],['Sel kosong / nol','Kosong mempertahankan data lama; 0 mengubahnya menjadi nol. HAPUS mengosongkan nilai.'],['Periode laba','FY = setahun penuh. Q1–Q4 = triwulan. Laba bersih kumulatif sejak Januari.'],['Bank baru','Tambahkan baris dengan nama bank, indikator, satuan dan nilai. Jangan mengganti nama bank lama.'],['Presisi data lama','Histori yang dahulu sudah dibulatkan tetap mengikuti presisi sumber database.'],['Data turunan','Pangsa dan pertumbuhan pada file mengikuti nilai database. Perbarui juga jika angka sumbernya berubah.']];
 for(const [i,row] of instructions.entries())g.getRow(i+5).values=row;
 g.getCell('A27').value='Sumber laporan — tambah baris untuk periode baru';g.getCell('A28').value='Sumber bank berlaku untuk angka yang Anda perbarui; sumber spesifik historis dipertahankan oleh website.';
 const sr=payload.issuers.flatMap(b=>dataset.periods.map(p=>{const source=dataset.sourcesByPeriod?.[p]?.[b.Kode_Emiten];return[label(b.Kode_Emiten),p.replace(/^FY/,'FY ').replace('-',' '),source?.url||'https://digimetric.vercel.app/data/dashboard_data.json',source?.name||'Dataset historis; belum diverifikasi ulang.'];}));
 g.addTable({name:'SumberLaporan',ref:'A30',headerRow:true,style:{theme:'TableStyleMedium2',showRowStripes:true},columns:['Bank','Periode','Link laporan','Catatan'].map(name=>({name,filterButton:true})),rows:sr});
 [29,105,78,75].forEach((width,i)=>{g.getColumn(i+1).width=width;});g.views=[{showGridLines:false}];g.eachRow((row,i)=>{row.height=i>=6&&i<=15?43:26;row.eachCell(cell=>{cell.font={name:'Arial',size:11,color:{argb:'FF20364B'}};if(i>=6&&i<=15)cell.alignment={wrapText:true,vertical:'middle'};if(i===5||i===30){cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF20364B'}};cell.font={name:'Arial',size:11,bold:true,color:{argb:'FFFFFFFF'}};}});});g.getCell('A2').font={name:'Arial',size:16,bold:true};
 return wb;
}
