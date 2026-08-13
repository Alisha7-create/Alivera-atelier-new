import { db } from '../../src/compat.js';
export const access='admin';
export const methods=['GET','POST','PUT','DELETE'];
function clean(v){return String(v??'').trim()}
function nullable(v){const s=clean(v);return s||null}
export default async function(req,res){
 if(req.method==='GET'){const {rows}=await db.query('SELECT * FROM campaigns ORDER BY created_at DESC');return res.json(rows)}
 const b=req.body||{};
 if(req.method==='DELETE'){if(!b.id)return res.status(400).json({error:'Campaign id required.'});await db.query('DELETE FROM campaigns WHERE id=$1',[b.id]);return res.json({ok:true})}
 const title=clean(b.title),code=clean(b.code).toUpperCase().replace(/[^A-Z0-9_-]/g,'');
 const type=b.discount_type==='fixed'?'fixed':'percent';const value=Math.max(0,Number(b.discount_value)||0);const min=Math.max(0,Number(b.min_subtotal)||0);
 if(!title||!code||value<=0)return res.status(400).json({error:'Title, code and a positive discount are required.'});
 if(type==='percent'&&value>100)return res.status(400).json({error:'Percentage discount cannot exceed 100%.'});
 const maxUses=b.max_uses===''||b.max_uses==null?null:Math.max(1,Number(b.max_uses));const perCustomer=b.max_uses_per_customer===''||b.max_uses_per_customer==null?null:Math.max(1,Number(b.max_uses_per_customer));
 const starts=nullable(b.starts_at),ends=nullable(b.ends_at);let r;
 if(req.method==='POST') r=await db.query("INSERT INTO campaigns (title,description,code,discount_type,discount_value,min_subtotal,starts_at,ends_at,max_uses,max_uses_per_customer,active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *",[title,clean(b.description),code,type,value,min,starts,ends,maxUses,perCustomer,b.active!==false]);
 else {if(!b.id)return res.status(400).json({error:'Campaign id required.'});r=await db.query("UPDATE campaigns SET title=$1,description=$2,code=$3,discount_type=$4,discount_value=$5,min_subtotal=$6,starts_at=$7,ends_at=$8,max_uses=$9,max_uses_per_customer=$10,active=$11,updated_at=now() WHERE id=$12 RETURNING *",[title,clean(b.description),code,type,value,min,starts,ends,maxUses,perCustomer,b.active!==false,b.id]);}
 res.json(r.rows[0]);
}