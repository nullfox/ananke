import { Method} from '../../interfaces';

interface Params {
  id: string;
}

const method: Method<Params> = {
  validation: (yup) => ({
    id: yup.string().required(),
  }),
  handler: async (params, context) => {
    const { user } = context;
  
    if (!user) {
      throw new Error('Invalid user');
    }
  
    return params.id;
  },
};

export default method;
