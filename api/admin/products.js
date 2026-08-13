import { db } from '../../src/compat.js';
export const access = 'admin';
export const methods = ['GET','POST','PUT','DELETE'];
const site=req=>`https://${req.headers.host}`;
const publicify=(req,row)=>{if(!row)return row;const x={...row};if(String(x.image_url||'').startsWith('r2://'))x.image_url=`${site(req)}/api/media/product/${x.id}`;if(String(x.size_chart_url||'').startsWith('r2://'))x.size_chart_url=`${site(req)}/api/media/product/${x.id}/chart`;return x;};
const stored=(value,field,existing)=>{const s=String(value||'');if(!s)return '';if(s.startsWith('r2://'))return s;if(s.includes('/api/media/product/'))return existing||'';return s;};
export default async function(req,res){
 if(req.method==='GET'){const {rows}=await db.query("SELECT * FROM products ORDER BY created_at DESC"); return res.json(rows.map(x=>publicify(req,x)))}
 const b=req.body||{};
 if(req.method==='POST'){const slug=String(b.slug||b.name||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); const {rows}=await db.query("INSERT INTO products (name,slug,description,price,sizes,image_url,size_chart_url,stock,active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *",[String(b.name||''),slug,String(b.description||''),Number(b.price)||0,Array.isArray(b.sizes)?b.sizes:[],String(b.image_url||''),String(b.size_chart_url||''),Math.max(0,Number(b.stock)||0),b.active!==false]); return res.json(publicify(req,rows[0]))}
 if(req.method==='PUT'){const old=(await db.query('SELECT image_url,size_chart_url FROM products WHERE id=$1 LIMIT 1',[b.id])).rows[0]||{};const {rows}=await db.query("UPDATE products SET name=$1,description=$2,price=$3,sizes=$4,image_url=$5,size_chart_url=$6,stock=$7,active=$8,updated_at=now() WHERE id=$9 RETURNING *",[String(b.name||''),String(b.description||''),Number(b.price)||0,Array.isArray(b.sizes)?b.sizes:[],stored(b.image_url,'image_url',old.image_url),stored(b.size_chart_url,'size_chart_url',old.size_chart_url),Math.max(0,Number(b.stock)||0),b.active!==false,b.id]); return res.json(publicify(req,rows[0]))}
 if(req.method==='DELETE'){await db.query("DELETE FROM products WHERE id=$1",[b.id]); return res.json({ok:true})}
}
